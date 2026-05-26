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

  const [overlay, setOverlay] = useState<"pending" | "rejected" | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | undefined>();
  const [checkingStatus, setCheckingStatus] = useState(false);
  const capturedTokenRef = useRef("");
  const capturedRefreshRef = useRef<string | undefined>(undefined);

  const handleSuccess = useCallback(
    async (_rawUser: SharedAuthUser, token: string, refreshToken?: string) => {
      capturedTokenRef.current = token;
      capturedRefreshRef.current = refreshToken;
      let profile: VendorAuthUser;
      try {
        profile = (await api.getMe()) as VendorAuthUser;
      } catch {
        api.clearTokens();
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
    try {
      const profile = (await api.getMe()) as VendorAuthUser;
      const approvalStatus = profile.approvalStatus;
      if (approvalStatus === "pending") return;
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
