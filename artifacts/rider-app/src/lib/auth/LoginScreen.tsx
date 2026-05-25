import { BiometricEnrollOverlay, LoginScreen as SharedLoginScreen } from "@workspace/auth-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { api } from "../api";
import { useRiderAuthConfig } from "../AuthConfigContext";
import { normalizeRoles, useAuth as useRiderAuth } from "../rider-auth";

/* ── Google Identity Services types & loader ─────────────────────────────── */

type GsiAccounts = {
  accounts: {
    id: {
      initialize: (cfg: { client_id: string; callback: (r: { credential: string }) => void }) => void;
      prompt: (n: (n: { isNotDisplayed: () => boolean; isSkippedMoment: () => boolean }) => void) => void;
    };
  };
};

async function loadGsi(): Promise<GsiAccounts> {
  const w = window as unknown as { google?: GsiAccounts };
  if (!w.google) {
    await new Promise<void>((res, rej) => {
      const s = document.createElement("script");
      s.src = "https://accounts.google.com/gsi/client";
      s.async = true;
      s.onload = () => res();
      s.onerror = () => rej(new Error("Failed to load Google SDK"));
      document.head.appendChild(s);
    });
  }
  return (window as unknown as { google: GsiAccounts }).google;
}

function gsiOneTap(g: GsiAccounts, clientId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    g.accounts.id.initialize({ client_id: clientId, callback: (r) => resolve(r.credential) });
    g.accounts.id.prompt((n) => {
      if (n.isNotDisplayed() || n.isSkippedMoment())
        reject(new Error("Google sign-in cancelled or not displayed"));
    });
  });
}

/* ── Facebook SDK types & loader ─────────────────────────────────────────── */

type FbSDK = {
  init: (cfg: { appId: string; version: string }) => void;
  login: (cb: (r: { authResponse?: { accessToken: string }; status: string }) => void) => void;
};

async function loadFbSdk(appId: string): Promise<FbSDK> {
  const w = window as unknown as { FB?: FbSDK };
  if (!w.FB) {
    await new Promise<void>((res, rej) => {
      const s = document.createElement("script");
      s.src = "https://connect.facebook.net/en_US/sdk.js";
      s.async = true;
      s.onload = () => res();
      s.onerror = () => rej(new Error("Failed to load Facebook SDK"));
      document.head.appendChild(s);
    });
  }
  const FB = (window as unknown as { FB: FbSDK }).FB;
  FB.init({ appId, version: "v18.0" });
  return FB;
}

type SocialResult = { token: string; user: unknown; refreshToken?: string };

/* ── Component ───────────────────────────────────────────────────────────── */

export interface LoginScreenProps {
  onSuccess?: (token: string, profile: unknown) => void;
}

export default function LoginScreen({ onSuccess }: LoginScreenProps) {
  const { login } = useRiderAuth();
  const [, navigate] = useLocation();
  const authConfig = useRiderAuthConfig();
  const [enrollData, setEnrollData] = useState<{
    token: string;
    refreshToken: string;
    profile: unknown;
  } | null>(null);

  const finishLogin = (token: string, profile: unknown, refreshToken: string) => {
    login(token, profile as never, refreshToken || undefined);
    onSuccess?.(token, profile);
    navigate("/");
  };

  const handleSuccess = async (user: unknown, token: string) => {
    const roles = normalizeRoles(user as { roles?: unknown; role?: unknown });
    if (roles.length > 0 && !roles.includes("rider")) {
      throw new Error(
        `Your account is registered as a ${roles[0] ?? "unknown"}. This app is for riders only.`
      );
    }
    const refreshToken = api.getRefreshToken() ?? "";
    api.storeTokens(token, refreshToken || undefined);
    try {
      const { isBiometricAvailable, isBiometricEnabled } = await import("../biometric");
      const [available, enrolled] = await Promise.all([isBiometricAvailable(), isBiometricEnabled()]);
      if (available && !enrolled && refreshToken) {
        setEnrollData({ token, refreshToken, profile: user });
        return;
      }
    } catch {
      /* biometric unavailable — proceed normally */
    }
    finishLogin(token, user, refreshToken);
  };

  const handleGoogle = async () => {
    const clientId = authConfig.googleClientId;
    if (!clientId) return;
    const g = await loadGsi();
    const idToken = await gsiOneTap(g, clientId);
    const res = (await api.socialGoogle({ idToken })) as SocialResult;
    await handleSuccess(res.user, res.token);
  };

  const handleFacebook = async () => {
    const appId = authConfig.facebookAppId;
    if (!appId) return;
    const FB = await loadFbSdk(appId);
    const accessToken = await new Promise<string>((resolve, reject) => {
      FB.login((r) => {
        if (r.authResponse?.accessToken) resolve(r.authResponse.accessToken);
        else reject(new Error("Facebook login cancelled"));
      });
    });
    const res = (await api.socialFacebook({ accessToken })) as SocialResult;
    await handleSuccess(res.user, res.token);
  };

  const handleEnrollAccept = async () => {
    if (!enrollData) return;
    try {
      const { storeBiometricToken, setBiometricEnabled } = await import("../biometric");
      await storeBiometricToken(enrollData.refreshToken);
      await setBiometricEnabled(true);
    } catch {
      /* non-fatal */
    }
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
      onSuccess={(user, token) => { void handleSuccess(user, token); }}
      onGoogle={() => { void handleGoogle(); }}
      onFacebook={() => { void handleFacebook(); }}
    />
  );
}
