import {
  LoginScreen as SharedLoginScreen,
  PendingOverlay,
  RejectedOverlay,
  ThemeProvider,
  type AuthUser as SharedAuthUser,
} from "@workspace/auth-react";
import { useCallback, useRef, useState } from "react";
import { useLocation } from "wouter";
import { api } from "../api";
import { getVendorAuthConfig, usePlatformConfig } from "../useConfig";
import { useAuth as useAuthContext, type AuthUser as VendorAuthUser } from "../vendor-auth";
import { useAppStatus } from "./useAppStatus";

export interface LoginScreenProps {
  onSuccess?: (token: string, profile: VendorAuthUser) => void;
}

function normalizeRoles(profile: VendorAuthUser): string[] {
  if (Array.isArray(profile.roles) && profile.roles.length > 0) return profile.roles;
  const legacyRole = (profile as unknown as { role?: string }).role;
  if (typeof legacyRole === "string") return [legacyRole];
  return [];
}

function getRejectionReason(profile: VendorAuthUser): string | undefined {
  return (
    (profile as unknown as { approvalNote?: string }).approvalNote ??
    profile.rejectionReason ??
    undefined
  );
}

export function LoginScreen({ onSuccess }: LoginScreenProps) {
  const { login } = useAuthContext();
  const [, navigate] = useLocation();
  const { config } = usePlatformConfig();
  const auth = getVendorAuthConfig(config);
  const { supportPhone } = useAppStatus();

  const [overlay, setOverlay] = useState<"pending" | "rejected" | "error" | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | undefined>();
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [pendingStatusMsg, setPendingStatusMsg] = useState<string | null>(null);
  const capturedTokenRef = useRef("");
  const capturedRefreshRef = useRef<string | undefined>(undefined);

  const handleSuccess = useCallback(
    async (_rawUser: SharedAuthUser, token: string, refreshToken?: string) => {
      capturedTokenRef.current = token;
      capturedRefreshRef.current = refreshToken;
      /* GAP 3 fix: store tokens before getMe() so the request is authenticated */
      api.storeTokens(token, refreshToken);
      let profile: VendorAuthUser;
      try {
        profile = (await api.getMe()) as VendorAuthUser;
      } catch {
        api.clearTokens();
        setErrorMsg("Unable to verify your account. Please check your connection and try again.");
        setOverlay("error");
        return;
      }
      const approvalStatus = profile.approvalStatus;
      if (approvalStatus === "pending") { setOverlay("pending"); return; }
      if (approvalStatus === "rejected") {
        setRejectionReason(getRejectionReason(profile));
        setOverlay("rejected");
        return;
      }
      if (!normalizeRoles(profile).includes("vendor")) { api.clearTokens(); return; }
      login(token, profile, refreshToken);
      onSuccess?.(token, profile);
      navigate("/");
    },
    [login, navigate, onSuccess]
  );

  const handleCheckStatus = useCallback(async () => {
    setCheckingStatus(true);
    setPendingStatusMsg(null);
    try {
      const profile = (await api.getMe()) as VendorAuthUser;
      const approvalStatus = profile.approvalStatus;
      if (approvalStatus === "pending") {
        /* GAP 2 fix: show visible feedback instead of silently returning */
        setPendingStatusMsg("Your application is still under review. Please check back later.");
        return;
      }
      if (approvalStatus === "rejected") {
        setRejectionReason(getRejectionReason(profile));
        setOverlay("rejected");
        return;
      }
      const token = capturedTokenRef.current;
      if (token) {
        login(token, profile, capturedRefreshRef.current);
        navigate("/");
      }
    } finally {
      setCheckingStatus(false);
    }
  }, [login, navigate]);

  const handleSignOut = useCallback(() => {
    api.clearTokens();
    setOverlay(null);
    setErrorMsg("");
  }, []);

  if (overlay === "pending")
    return (
      <ThemeProvider role="vendor">
        <PendingOverlay
          onCheckStatus={handleCheckStatus}
          onSignOut={handleSignOut}
          supportPhone={supportPhone}
          checking={checkingStatus}
        />
        {pendingStatusMsg && (
          <div className="fixed bottom-6 left-1/2 z-50 w-[calc(100%-3rem)] max-w-sm -translate-x-1/2 rounded-xl bg-amber-50 px-4 py-3 text-center text-[13px] font-medium text-amber-800 shadow-lg ring-1 ring-amber-200">
            {pendingStatusMsg}
          </div>
        )}
      </ThemeProvider>
    );
  if (overlay === "rejected")
    return (
      <ThemeProvider role="vendor">
        <RejectedOverlay
          rejectionReason={rejectionReason}
          onSignOut={handleSignOut}
          supportPhone={supportPhone}
        />
      </ThemeProvider>
    );
  if (overlay === "error")
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 py-10 font-[Inter,system-ui,sans-serif]">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 ring-1 ring-red-500/25">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Something went wrong</h2>
            <p className="mt-1.5 text-[14px] leading-relaxed text-red-500/90">{errorMsg}</p>
          </div>
          <div className="flex flex-col gap-3">
            <button
              onClick={handleSignOut}
              className="flex w-full items-center justify-center rounded-xl bg-[#1A56DB] px-6 py-3 text-[14px] font-bold text-white transition-all duration-200 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A56DB]/60"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );

  return (
    <ThemeProvider role="vendor">
      <SharedLoginScreen
        role="vendor"
        logoSrc="/ajkmart-logo.png"
        logoAlt="AJKMart"
        enableBiometric={false}
        enableSocial
        enableEmailOtp
        enableMagicLinkModal
        loginMethodTabs={["otp", "password", "email"]}
        googleClientId={auth.googleClientId}
        facebookAppId={auth.facebookAppId}
        onSuccess={handleSuccess}
        onRegisterPress={() => navigate("/register")}
        captureDevOtp
      />
    </ThemeProvider>
  );
}
