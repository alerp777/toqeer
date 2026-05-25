import { createLogger } from "@/lib/logger";
import { useQueryClient } from "@tanstack/react-query";
import {
  AuthProvider as SharedAuthProvider,
  useAuthContext,
  useTokenRefresh,
  type AuthUser as SharedAuthUser,
} from "@workspace/auth-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "wouter";
import { api, getRiderTokenStorage, tokenStoreReady } from "./api";
import { getRiderApiBase } from "./envValidation";
import { executeLogoutSequence } from "./logoutSequence";
const log = createLogger("[auth]");

/**
 * Returns true when the error represents a network-level failure (server
 * unreachable, DNS, CORS preflight, timeout) rather than an HTTP-level
 * rejection (401, 403, 422 …).  Used at startup so a temporary outage does
 * not clear a valid cached session and force the rider back to login.
 */
function isNetworkUnreachable(err: unknown): boolean {
  /* fetch() itself threw — no HTTP response was received at all */
  if (err instanceof TypeError) return true;
  const e = err as Record<string, unknown>;
  /* No numeric status → error came before an HTTP response (timeout, abort
     already handled separately, ECONNREFUSED, etc.) */
  if (typeof e.status !== "number") return true;
  /* 5xx → server reached but failing; keep session so rider can retry */
  if (e.status >= 500) return true;
  return false;
}

export function normalizeRoles(u: { roles?: unknown; role?: unknown }): string[] {
  if (Array.isArray(u.roles)) return u.roles as string[];
  if (typeof u.role === "string") return [u.role];
  return [];
}

export interface AuthUser {
  id: string;
  phone: string;
  name?: string;
  email?: string;
  avatar?: string;
  isOnline: boolean;
  walletBalance: string;
  isRestricted?: boolean;
  approvalStatus?: string;
  rejectionReason?: string | null;
  roles: string[];
  createdAt?: string;
  lastLoginAt?: string;
  stats: {
    deliveriesToday: number;
    earningsToday: number;
    totalDeliveries: number;
    totalEarnings: number;
    rating?: number;
  };
  cnic?: string;
  city?: string;
  address?: string;
  emergencyContact?: string;
  vehicleType?: string;
  vehiclePlate?: string;
  vehiclePhoto?: string;
  vehicleRegNo?: string;
  drivingLicense?: string;
  bankName?: string;
  bankAccount?: string;
  bankAccountTitle?: string;
  twoFactorEnabled?: boolean;
  cnicDocUrl?: string | null;
  licenseDocUrl?: string | null;
  regDocUrl?: string | null;
  dailyGoal?: number | null;
}

interface AuthCtx {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  storageError: boolean;
  /** True when startup getMe() failed with a network / 5xx error.
   *  The cached token is preserved so the rider's session survives a retry. */
  apiUnreachable: boolean;
  /** Re-attempt the startup getMe() without a full page reload. */
  retryConnection: () => void;
  twoFactorPending: boolean;
  setTwoFactorPending: (v: boolean) => void;
  login: (token: string, user: AuthUser, refreshToken?: string) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  sessionExpired: boolean;
  clearSessionExpired: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);
export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside RiderAuthProvider");
  return ctx;
}

export function RiderAuthProvider({ children }: { children: ReactNode }) {
  return (
    <SharedAuthProvider baseURL={getRiderApiBase()} role="rider" storageType="web">
      <RiderAuthInner>{children}</RiderAuthInner>
    </SharedAuthProvider>
  );
}

function RiderAuthInner({ children }: { children: ReactNode }) {
  const sharedAuth = useAuthContext();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [storageError, setStorageError] = useState(false);
  const [apiUnreachable, setApiUnreachable] = useState(false);
  /* Incrementing this counter re-triggers the startup getMe() effect so the
     rider can retry without a full page reload. */
  const [retryKey, setRetryKey] = useState(0);
  const [twoFactorPending, setTwoFactorPending] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const refreshUserInflightRef = useRef<Promise<void> | null>(null);

  const handleSdkLogout = useCallback(() => {
    api.clearTokens();
    setToken(null);
    setUser(null);
    sharedAuth.logout();
    setSessionExpired(true);
    navigate("/login");
  }, [sharedAuth, navigate]);

  useTokenRefresh({
    tokenStorage: getRiderTokenStorage(),
    baseURL: getRiderApiBase(),
    refreshEndpoint: "/auth/refresh",
    leewaySeconds: 60,
    onLogout: handleSdkLogout,
    onRefresh: (newTok: string) => {
      setToken(newTok);
    },
  });

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      /* Reset unreachable flag at the start of each attempt so the retry path
         starts fresh without stale state from the previous attempt. */
      setApiUnreachable(false);
      setLoading(true);
      try {
        await tokenStoreReady;
      } catch (storeErr) {
        log.error("tokenStoreReady failed:", storeErr);
        api.clearTokens();
        setStorageError(true);
        setLoading(false);
        return;
      }
      if (controller.signal.aborted) return;
      const t = api.getToken();
      if (!t) {
        setLoading(false);
        return;
      }
      setToken(t);
      try {
        const u = await api.getMe(controller.signal);
        if (controller.signal.aborted) return;
        const roles = normalizeRoles(u);
        if (roles.length > 0 && !roles.includes("rider")) {
          api.clearTokens();
          setToken(null);
          setLoading(false);
          return;
        }
        u.roles = roles;
        sharedAuth.login(
          { id: u.id, phone: u.phone, email: u.email, role: "rider" } satisfies SharedAuthUser,
          t
        );
        setUser(u);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        const e = err as Record<string, unknown>;
        if (e.code === "APPROVAL_PENDING") {
          setUser({
            id: "",
            phone: "",
            isOnline: false,
            walletBalance: "0",
            roles: [],
            approvalStatus: "pending",
            stats: { deliveriesToday: 0, earningsToday: 0, totalDeliveries: 0, totalEarnings: 0 },
          });
          return;
        }
        if (e.code === "APPROVAL_REJECTED") {
          setUser({
            id: "",
            phone: "",
            isOnline: false,
            walletBalance: "0",
            roles: [],
            approvalStatus: "rejected",
            rejectionReason: (e.rejectionReason as string | undefined) ?? null,
            stats: { deliveriesToday: 0, earningsToday: 0, totalDeliveries: 0, totalEarnings: 0 },
          });
          return;
        }
        if (isNetworkUnreachable(err)) {
          /* Network / 5xx failure — preserve the token so the session survives
             a temporary outage.  The app will surface a retry screen instead
             of bouncing the rider to the login page. */
          log.warn("startup getMe failed with network error — keeping token, showing retry screen", err);
          setApiUnreachable(true);
          /* Do NOT clear the token or navigate to /login. */
          return;
        }
        /* HTTP 4xx (401, 403, …) — the token is invalid; clear it as before. */
        api.clearTokens();
        setToken(null);
      } finally {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [sharedAuth, retryKey]);

  useEffect(() => {
    const clearAuth = () => {
      setToken(null);
      setUser(null);
      sharedAuth.logout();
      navigate("/login");
    };
    const unregister = api.registerLogoutCallback(clearAuth);
    const handleLogoutEvent = () => clearAuth();
    window.addEventListener("ajkmart:logout", handleLogoutEvent);
    return () => {
      unregister();
      window.removeEventListener("ajkmart:logout", handleLogoutEvent);
    };
  }, [sharedAuth, navigate]);

  const login = (t: string, u: AuthUser, refreshToken?: string) => {
    const roles = normalizeRoles(u);
    if (roles.length > 0 && !roles.includes("rider"))
      throw new Error("This app is for riders only");
    u.roles = roles;
    queryClient.clear();
    api.storeTokens(t, refreshToken);
    sharedAuth.login(
      { id: u.id, phone: u.phone, email: u.email, role: "rider" } satisfies SharedAuthUser,
      t
    );
    setToken(t);
    setUser(u);
  };

  const logout = () => {
    executeLogoutSequence(api, () => {
      try {
        sessionStorage.clear();
      } catch (_e) {}
      sharedAuth.logout();
      setToken(null);
      setUser(null);
      queryClient.clear();
      navigate("/login");
    });
  };

  const refreshUser = useCallback(async () => {
    if (refreshUserInflightRef.current) return refreshUserInflightRef.current;
    const p = (async () => {
      try {
        const u = await api.getMe();
        const roles = normalizeRoles(u);
        if (roles.length > 0 && !roles.includes("rider")) {
          api.clearTokens();
          setToken(null);
          setUser(null);
          sharedAuth.logout();
          return;
        }
        u.roles = roles;
        setUser(u);
      } catch (err) {
        log.warn("refreshUser failed:", err);
        try {
          window.dispatchEvent(new Event("ajkmart:refresh-user-failed"));
        } catch (_e) {
          /* ignore dispatch errors in SSR/test environments */
        }
      } finally {
        refreshUserInflightRef.current = null;
      }
    })();
    refreshUserInflightRef.current = p;
    return p;
  }, [sharedAuth]);

  const clearSessionExpired = useCallback(() => setSessionExpired(false), []);

  const retryConnection = useCallback(() => {
    /* Re-run the startup getMe() effect without a full page reload.
       Also flush any stale React Query cache so the retry starts clean. */
    queryClient.clear();
    setRetryKey((k) => k + 1);
  }, [queryClient]);

  return (
    <Ctx.Provider
      value={{
        user,
        token,
        loading,
        storageError,
        apiUnreachable,
        retryConnection,
        twoFactorPending,
        setTwoFactorPending,
        login,
        logout,
        refreshUser,
        sessionExpired,
        clearSessionExpired,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
