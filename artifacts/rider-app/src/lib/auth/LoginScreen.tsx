import { BiometricEnrollOverlay, LoginScreen as SharedLoginScreen } from "@workspace/auth-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { api } from "../api";
import { useRiderAuthConfig } from "../AuthConfigContext";
import { normalizeRoles, useAuth as useRiderAuth } from "../rider-auth";
import { facebookLogin, googleOneTap } from "./social-oauth";

type SocialResult = { token: string; user: unknown; refreshToken?: string };

export interface LoginScreenProps {
  onSuccess?: (token: string, profile: unknown) => void;
}

export default function LoginScreen({ onSuccess }: LoginScreenProps) {
  const { login } = useRiderAuth();
  const [, navigate] = useLocation();
  const authConfig = useRiderAuthConfig();
  const [devOtp, setDevOtp] = useState<string | undefined>(undefined);
  const [enrollData, setEnrollData] = useState<{
    token: string; refreshToken: string; profile: unknown;
  } | null>(null);

  const finishLogin = (token: string, profile: unknown, refreshToken: string) => {
    login(token, profile as never, refreshToken || undefined);
    onSuccess?.(token, profile);
    navigate("/");
  };

  /**
   * Central success handler — called after every successful auth (OTP, password,
   * 2FA, social). refreshToken is now passed from the API response via the shared
   * LoginScreen's onSuccess(user, token, refreshToken) signature, eliminating the
   * stale-storage race condition that blocked biometric enrolment.
   */
  const handleSuccess = async (user: unknown, token: string, refreshToken?: string) => {
    const roles = normalizeRoles(user as { roles?: unknown; role?: unknown });
    if (roles.length > 0 && !roles.includes("rider")) {
      throw new Error(
        `Your account is registered as a ${roles[0] ?? "unknown"}. This app is for riders only.`
      );
    }
    /* Prefer the refresh token from the auth response; fall back to storage only
       when the response omits it (e.g. legacy server without refresh token). */
    const rToken = refreshToken ?? api.getRefreshToken() ?? "";
    api.storeTokens(token, rToken || undefined);
    try {
      const { isBiometricAvailable, isBiometricEnabled } = await import("../biometric");
      const [available, enrolled] = await Promise.all([isBiometricAvailable(), isBiometricEnabled()]);
      if (available && !enrolled && rToken) {
        setEnrollData({ token, refreshToken: rToken, profile: user });
        return;
      }
    } catch { /* biometric unavailable — proceed normally */ }
    finishLogin(token, user, rToken);
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

  if (enrollData) {
    return <BiometricEnrollOverlay onEnroll={handleEnrollAccept} onSkip={handleEnrollDecline} />;
  }

  return (
    <SharedLoginScreen
      role="rider"
      logoSrc="/ajkmart-logo.png"
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
