import { BiometricEnrollOverlay, LoginScreen as SharedLoginScreen, PendingOverlay, RejectedOverlay, ThemeProvider, useAuthTheme } from "@workspace/auth-react";
import { tDual } from "@workspace/i18n";
import { useCallback, useRef, useState } from "react";
import { useLocation } from "wouter";
import { api } from "../api";
import { useRiderAuthConfig } from "../AuthConfigContext";
import { normalizeRoles, useAuth as useRiderAuth } from "../rider-auth";
import { useLanguage } from "../useLanguage";
import { useAppStatus } from "./useAppStatus";
import { facebookLogin, googleOneTap } from "./social-oauth";
import { riderTheme } from "./theme";


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
  const { supportPhone } = useAppStatus();
  const [roleError, setRoleError] = useState<string | null>(null);
  const [overlay, setOverlay] = useState<"pending" | "rejected" | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | undefined>();
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [pendingStatusMsg, setPendingStatusMsg] = useState<string | null>(null);
  const [enrollData, setEnrollData] = useState<{
    token: string; refreshToken: string; profile: unknown;
  } | null>(null);
  const capturedTokenRef = useRef("");
  const capturedRefreshRef = useRef<string | undefined>(undefined);

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

    /* Approval status gate — pending/rejected riders cannot proceed to dashboard */
    const p = profile as { approvalStatus?: string; rejectionReason?: string | null };
    if (p.approvalStatus === "pending") {
      capturedTokenRef.current = token;
      capturedRefreshRef.current = rToken;
      setOverlay("pending");
      return;
    }
    if (p.approvalStatus === "rejected") {
      capturedTokenRef.current = token;
      capturedRefreshRef.current = rToken;
      setRejectionReason(p.rejectionReason ?? undefined);
      setOverlay("rejected");
      return;
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

  const handleCheckStatus = useCallback(async () => {
    setCheckingStatus(true);
    setPendingStatusMsg(null);
    try {
      const profile = (await api.getMe()) as {
        approvalStatus?: string;
        rejectionReason?: string | null;
      };
      if (profile.approvalStatus === "pending") {
        setPendingStatusMsg("Your application is still under review. Please check back later.");
        return;
      }
      if (profile.approvalStatus === "rejected") {
        setRejectionReason(profile.rejectionReason ?? undefined);
        setOverlay("rejected");
        return;
      }
      const token = capturedTokenRef.current;
      if (token) {
        finishLogin(token, profile, capturedRefreshRef.current ?? "");
      }
    } finally {
      setCheckingStatus(false);
    }
  }, []);

  const handleOverlaySignOut = useCallback(() => {
    api.clearTokens();
    capturedTokenRef.current = "";
    capturedRefreshRef.current = undefined;
    setOverlay(null);
    setRejectionReason(undefined);
  }, []);

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

  /* ── Pending approval screen ─────────────────────────────────────────────── */
  if (overlay === "pending") {
    return (
      <ThemeProvider role="rider">
        <PendingOverlay
          onCheckStatus={handleCheckStatus}
          onSignOut={handleOverlaySignOut}
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
  }

  /* ── Rejected screen ─────────────────────────────────────────────────────── */
  if (overlay === "rejected") {
    return (
      <ThemeProvider role="rider">
        <RejectedOverlay
          rejectionReason={rejectionReason}
          onSignOut={handleOverlaySignOut}
          supportPhone={supportPhone}
        />
      </ThemeProvider>
    );
  }

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

  const translatedStrings = {
    phoneLabel: tDual("phoneNumber", language),
    continueBtn: tDual("continueBtn", language),
    back: tDual("back", language),
    newHere: tDual("noAccount", language),
    createAccount: tDual("createAccount", language),
    sendMagicLink: tDual("sendMagicLink", language),
    twoFactorLabel: tDual("enterTotpCode", language),
    subtitleTotp: tDual("subtitleTotp", language),
    subtitleLoginOtp: tDual("subtitleLoginOtp", language),
    usePasswordInstead: tDual("usePasswordInstead", language),
    useOtpInstead: tDual("useOtpInstead", language),
    useBackupCode: tDual("useBackupCode", language),
    useAuthAppInstead: tDual("useAuthAppInstead", language),
    trustDevice: tDual("trustDevice", language),
  };

  return (
    <ThemeProvider role="rider" theme={riderTheme}>
      <SharedLoginScreen
        role="rider"
        logoSrc="/ajkmart-logo.png"
        logoAlt="AJKMart"
        smartLogin
        enableBiometric={authConfig.biometricEnabled}
        enableSocial={authConfig.googleEnabled || authConfig.facebookEnabled}
        enableEmailOtp={authConfig.emailEnabled}
        enableMagicLinkModal={authConfig.magicLinkEnabled}
        loginMethodTabs={(() => {
          const tabs: Array<"otp" | "password" | "email"> = [];
          if (authConfig.phoneEnabled) tabs.push("otp");
          if (authConfig.usernamePassword) tabs.push("password");
          if (authConfig.emailEnabled) tabs.push("email");
          return tabs.length > 0 ? tabs : ["otp"];
        })()}
        captureDevOtp
        strings={translatedStrings}
        translateError={(raw) => {
          const map: Record<string, string> = {
            "account has been suspended": tDual("accountBlocked", language),
            "registrations are currently closed": tDual("registrationClosed", language),
            "social login is not configured": tDual("socialLoginNotConfigured", language),
            "session expired": tDual("sessionExpired", language),
            "invalid otp": tDual("invalidOtp", language),
            "invalid credentials": tDual("invalidCredentials", language),
            "linked to google": tDual("linkedToGoogle", language),
            "linked to facebook": tDual("linkedToFacebook", language),
            "not a rider account": tDual("wrongAppRider", language),
            "not registered as rider": tDual("wrongAppRider", language),
          };
          const lc = raw.toLowerCase();
          const hit = Object.keys(map).find(k => lc.includes(k));
          return hit ? map[hit]! : raw;
        }}
        onSuccess={(user, token, refreshToken) => { void handleSuccess(user, token, refreshToken); }}
        onGoogle={authConfig.googleEnabled ? () => { void handleGoogle(); } : undefined}
        onFacebook={authConfig.facebookEnabled ? () => { void handleFacebook(); } : undefined}
        onRegisterPress={() => navigate("/register")}
      />
    </ThemeProvider>
  );
}
