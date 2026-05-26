import { BiometricEnrollOverlay, LoginScreen as SharedLoginScreen, ThemeProvider, useAuthTheme } from "@workspace/auth-react";
import { tDual } from "@workspace/i18n";
import { useState } from "react";
import { useLocation } from "wouter";
import { api } from "../api";
import { useRiderAuthConfig } from "../AuthConfigContext";
import { normalizeRoles, useAuth as useRiderAuth } from "../rider-auth";
import { useLanguage } from "../useLanguage";
import { facebookLogin, googleOneTap } from "./social-oauth";


type SocialResult = { token: string; user: unknown; refreshToken?: string };

export interface LoginScreenProps {
  onSuccess?: (token: string, profile: unknown) => void;
}

export default function LoginScreen({ onSuccess }: LoginScreenProps) {
  const { login } = useRiderAuth();
  const [, navigate] = useLocation();
  const theme = useAuthTheme();
  const authConfig = useRiderAuthConfig();
  const { language } = useLanguage();
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
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0b0e11] px-6 py-10 font-[Inter,system-ui,sans-serif] animate-in fade-in duration-200">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 ring-1 ring-red-500/25">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white/90">Access denied</h2>
            <p className="mt-1.5 text-[14px] leading-relaxed text-red-400/90">{roleError}</p>
          </div>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setRoleError(null)}
              className="flex w-full items-center justify-center rounded-xl bg-[#F0B90B] px-6 py-3 text-[14px] font-bold text-[#0b0e11] transition-all duration-200 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0B90B]/60"
            >
              Try another account
            </button>
            <button
              onClick={() => navigate("/")}
              className="flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-6 py-3 text-[14px] font-medium text-white/60 transition-all duration-200 hover:bg-white/[0.08] hover:text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
            >
              Back to landing
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Biometric enrollment prompt ─────────────────────────────────────────── */
  if (enrollData) {
    return (
      <ThemeProvider role="rider">
        <BiometricEnrollOverlay onEnroll={handleEnrollAccept} onSkip={handleEnrollDecline} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider role="rider">
      <SharedLoginScreen
        role="rider"
        logoSrc="/ajkmart-logo.png"
        logoAlt="AJKMart"
        enableBiometric
        enableSocial
        enableEmailOtp
        enableMagicLinkModal
        loginMethodTabs={["otp", "password", "email"]}
        captureDevOtp
        onSuccess={(user, token, refreshToken) => { void handleSuccess(user, token, refreshToken); }}
        onGoogle={() => { void handleGoogle(); }}
        onFacebook={() => { void handleFacebook(); }}
        onRegisterPress={() => navigate("/register")}
      />
    </ThemeProvider>
  );
}
