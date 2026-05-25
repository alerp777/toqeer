import { BiometricEnrollOverlay, LoginScreen as SharedLoginScreen } from "@workspace/auth-react";
import { tDual } from "@workspace/i18n";
import { useState } from "react";
import { useLocation } from "wouter";
import { api } from "../api";
import { useRiderAuthConfig } from "../AuthConfigContext";
import { normalizeRoles, useAuth as useRiderAuth } from "../rider-auth";
import { useLanguage } from "../useLanguage";
import { riderTheme } from "./theme";
import { facebookLogin, googleOneTap } from "./social-oauth";


type SocialResult = { token: string; user: unknown; refreshToken?: string };

export interface LoginScreenProps {
  onSuccess?: (token: string, profile: unknown) => void;
}

export default function LoginScreen({ onSuccess }: LoginScreenProps) {
  const { login } = useRiderAuth();
  const [, navigate] = useLocation();
  const authConfig = useRiderAuthConfig();
  const { language } = useLanguage();
  const [devOtp, setDevOtp] = useState<string | undefined>(undefined);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [enrollData, setEnrollData] = useState<{
    token: string; refreshToken: string; profile: unknown;
  } | null>(null);

  const finishLogin = (token: string, profile: unknown, refreshToken: string) => {
    login(token, profile as never, refreshToken || undefined);
    onSuccess?.(token, profile);
    navigate("/");
  };

  /**
   * Central post-auth handler. Always calls api.getMe() for the authoritative
   * server profile — never trusts callback payload roles alone — so email OTP's
   * synthetic user object and other spoofed payloads cannot bypass the role gate.
   */
  const handleSuccess = async (user: unknown, token: string, refreshToken?: string) => {
    /* Store tokens first so api.getMe() can authenticate the request */
    const rToken = refreshToken ?? api.getRefreshToken() ?? "";
    api.storeTokens(token, rToken || undefined);

    /* Fetch authoritative profile; fall back to callback payload on network error */
    let profile: unknown = user;
    try {
      profile = await api.getMe();
    } catch {
      /* getMe() failed — network issue; continue with callback payload */
    }

    /* Fail-closed role guard: reject any account whose roles explicitly exclude rider */
    const roles = normalizeRoles(profile as { roles?: unknown; role?: unknown });
    if (roles.length > 0 && !roles.includes("rider")) {
      api.clearTokens();
      setRoleError(tDual("accessDenied", language));
      return;
    }

    try {
      const { isBiometricAvailable, isBiometricEnabled } = await import("../biometric");
      const [available, enrolled] = await Promise.all([isBiometricAvailable(), isBiometricEnabled()]);
      if (available && !enrolled && rToken) {
        setEnrollData({ token, refreshToken: rToken, profile });
        return;
      }
    } catch { /* biometric unavailable — proceed normally */ }

    finishLogin(token, profile, rToken);
  };

  const handleGoogle = async () => {
    const clientId = authConfig.googleClientId;
    if (!clientId) return;
    const idToken = await googleOneTap(clientId);
    const res = (await api.socialGoogle({ idToken })) as SocialResult;
    await handleSuccess(res.user, res.token, res.refreshToken);
  };

  const handleFacebook = async () => {
    const appId = authConfig.facebookAppId;
    if (!appId) return;
    const accessToken = await facebookLogin(appId);
    const res = (await api.socialFacebook({ accessToken })) as SocialResult;
    await handleSuccess(res.user, res.token, res.refreshToken);
  };

  const handleEnrollAccept = async () => {
    if (!enrollData) return;
    try {
      const { storeBiometricToken, setBiometricEnabled } = await import("../biometric");
      await storeBiometricToken(enrollData.refreshToken);
      await setBiometricEnabled(true);
    } catch { /* non-fatal */ }
    const { token, refreshToken, profile } = enrollData;
    setEnrollData(null);
    finishLogin(token, profile, refreshToken);
  };

  const handleEnrollDecline = () => {
    if (!enrollData) return;
    const { token, refreshToken, profile } = enrollData;
    setEnrollData(null);
    finishLogin(token, profile, refreshToken);
  };

  /* ── Role-rejection screen ───────────────────────────────────────────────── */
  if (roleError) {
    return (
      <div style={{
        minHeight: "100vh", background: riderTheme.background, color: riderTheme.text,
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: 24, fontFamily: "Inter, system-ui, sans-serif",
      }}>
        <p style={{ color: riderTheme.error, textAlign: "center", maxWidth: 360, fontSize: 15, lineHeight: 1.5 }}>
          {roleError}
        </p>
        <button
          onClick={() => setRoleError(null)}
          style={{
            marginTop: 20, background: riderTheme.primary, color: riderTheme.background,
            border: "none", borderRadius: 8, padding: "10px 24px",
            fontWeight: 600, cursor: "pointer", fontSize: 14,
          }}
        >
          Try another account
        </button>
      </div>
    );
  }

  /* ── Biometric enrollment prompt ─────────────────────────────────────────── */
  if (enrollData) {
    return <BiometricEnrollOverlay onEnroll={handleEnrollAccept} onSkip={handleEnrollDecline} />;
  }

  return (
    <SharedLoginScreen
      role="rider"
      logoSrc="/ajkmart-logo.png"
      logoAlt="AJKMart"
      enableBiometric
      enableSocial
      enableEmailOtp
      enableMagicLinkModal
      loginMethodTabs={["otp", "password", "email"]}
      devOtp={import.meta.env.VITE_ALLOW_DEV_OTP === "true" ? devOtp : undefined}
      onOtpSent={(otp) => setDevOtp(otp)}
      onSuccess={(user, token, refreshToken) => { void handleSuccess(user, token, refreshToken); }}
      onGoogle={() => { void handleGoogle(); }}
      onFacebook={() => { void handleFacebook(); }}
    />
  );
}
