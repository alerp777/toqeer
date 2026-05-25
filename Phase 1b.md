#4 - Phase 1b: New Auth Components in @workspace/auth-react
Critical Agent Rules
ONLY touch files inside lib/auth-react/src/ — koi app file modify mat karo
Nayi files banao, existing files mat chhuao (sirf index.ts mein exports add karo)
Koi hardcoded color ya hex value nahi — sab useAuthTheme() se
Koi any type nahi — strict TypeScript only
Har nayi file ke baad tsc --noEmit run karo
Phase 1a se independent hai — parallel chal sakti hai. Sirf index.ts update mein careful raho (additive only)
Kaam complete hone ke baad ye nayi files FINAL hain — future mein sirf bug fixes allowed
What & Why
@workspace/auth-react mein 4 components/hooks missing hain jo rider-app aur vendor-app mein duplicate hain. Is task mein sirf NAYI files banao aur index.ts mein exports add karo.

Done Looks Like
5 nayi files bani hain:

lib/auth-react/src/hooks/useForgotPasswordFlow.ts
lib/auth-react/src/components/ForgotPasswordFlow.tsx
lib/auth-react/src/components/GuestLanding.tsx
lib/auth-react/src/components/AuthOverlay.tsx
lib/auth-react/src/hooks/useAppStatus.ts
index.ts mein nayi exports add hue hain (additive only — existing exports unchanged):

export { ForgotPasswordFlow } from "./components/ForgotPasswordFlow";
export type { ForgotPasswordFlowProps, ForgotPasswordStrings } from "./components/ForgotPasswordFlow";
export { useForgotPasswordFlow } from "./hooks/useForgotPasswordFlow";
export type { UseForgotPasswordFlowOptions, ForgotPasswordStep } from "./hooks/useForgotPasswordFlow";
export { GuestLanding } from "./components/GuestLanding";
export type { GuestLandingProps, GuestLandingStat, GuestLandingFeature } from "./components/GuestLanding";
export { PendingOverlay, RejectedOverlay, MaintenanceOverlay, BiometricEnrollOverlay } from "./components/AuthOverlay";
export { useAppStatus } from "./hooks/useAppStatus";
export type { UseAppStatusOptions, AppStatus } from "./hooks/useAppStatus";

tsc --noEmit on lib/auth-react → zero errors

File Specs
1. useForgotPasswordFlow.ts
export type ForgotPasswordStep =
  | "choose-method"
  | "send-otp"
  | "enter-otp"
  | "new-password"
  | "totp-verify"
  | "success";
export interface UseForgotPasswordFlowOptions {
  role: "rider" | "vendor";
  api: {
    forgotPassword: (data: { phone?: string; email?: string }) => Promise<unknown>;
    verifyResetOtp: (data: { phone?: string; email?: string; otp: string }) => Promise<{ resetToken: string }>;
    resetPassword: (data: { resetToken: string; newPassword: string }) => Promise<unknown>;
    twoFactorVerify?: (data: { code: string }) => Promise<unknown>;
  };
  onSuccess?: () => void;
}

Returns: { step, method: "phone"|"email", loading, error, resetToken, actions: { selectMethod, sendOtp, verifyOtp, setNewPassword, verifyTotp, reset } }

2. ForgotPasswordFlow.tsx
Props: UseForgotPasswordFlowOptions + extras:

interface ForgotPasswordFlowProps extends UseForgotPasswordFlowOptions {
  logoSrc?: string;
  logoAlt?: string;
  strings?: Partial<ForgotPasswordStrings>;
}

Consumes useForgotPasswordFlow hook
useAuthTheme() for ALL colors
useRateLimitCountdown for OTP cooldown (import from existing hooks)
PasswordInput component for new password + confirm (import from shared components)
OtpInput component for OTP entry (import from shared components)
6-step UI: choose method → enter phone/email → enter OTP → new password → TOTP (optional) → success
Logo displayed at top if logoSrc provided
Reference both custom apps' ForgotPassword.tsx for exact UX flow — merge best elements
ForgotPasswordStrings interface: { title, chooseMethod, phoneMethod, emailMethod, sendOtp, enterOtp, resendOtp, newPassword, confirmPassword, passwordsNoMatch, submit, success, twoFactorTitle }

3. GuestLanding.tsx
export interface GuestLandingStat { v: string; l: string; }
export interface GuestLandingFeature { icon: string; title: string; desc: string; color?: string; }
export interface GuestLandingProps {
  role: "rider" | "vendor";
  logoSrc?: string;                              // AJKMart logo image path
  logoAlt?: string;
  appName?: string;                              // e.g. "AJKMart Rider" / "AJKMart Vendor"
  heroTitle: string | { en: string; ur: string; roman: string };
  heroSubtitle?: string | { en: string; ur: string; roman: string };
  stats: GuestLandingStat[];
  features: GuestLandingFeature[];
  ctaLoginLabel: string | { en: string; ur: string; roman: string };
  ctaRegisterLabel: string | { en: string; ur: string; roman: string };
  onLogin: () => void;
  onRegister: () => void;
  defaultLanguage?: "en" | "ur" | "roman";
}

Layout (top to bottom):

Sticky navbar — logoSrc (agar diya) + appName + Login/Register buttons
Hero section — heroTitle (large), heroSubtitle, language switcher (EN/UR/Roman pills), CTA buttons
Stats strip — stats[] ka grid, animated numbers
Features section — features[] ka card grid
Language cycling: internal lang state, switcher pills top-right ya hero mein
Theme:

useAuthTheme() for ALL colors
RTL (dir="rtl") automatic karo when lang === "ur"
Noto Nastaliq Urdu font for Urdu text: fontFamily: '"Noto Nastaliq Urdu", serif'
Logo display: <img src={logoSrc} alt={logoAlt ?? appName ?? "Logo"} style={{ height: 40, objectFit: "contain" }} />

4. AuthOverlay.tsx
4 named exports. Sab useAuthTheme() use karein. Sab full-screen overlays.

// PendingOverlay
interface PendingOverlayProps {
  onCheckStatus: () => Promise<void>;
  onSignOut: () => void;
  supportPhone?: string;
  checking?: boolean;
}
// RejectedOverlay
interface RejectedOverlayProps {
  rejectionReason?: string;
  onSignOut: () => void;
  onContactSupport?: () => void;
  supportPhone?: string;
}
// MaintenanceOverlay
interface MaintenanceOverlayProps {
  message?: string;
  estimatedEnd?: string;
  onRetry?: () => void;
}
// BiometricEnrollOverlay
interface BiometricEnrollOverlayProps {
  onEnroll: () => Promise<void>;
  onSkip: () => void;
  enrolling?: boolean;
}

Reference rider Overlay.tsx for dark-themed implementation (radial gradients, gold accents)
Reference vendor Overlay.tsx for light-themed implementation (gradient backgrounds, blue accents)
Since sab useAuthTheme() use karenge → automatically rider par dark gold, vendor par light blue dikhega
5. useAppStatus.ts
export interface AppStatus {
  maintenance: boolean;
  maintenanceMsg?: string;
  supportPhone?: string;
  supportEmail?: string;
  isLoading: boolean;
  checkUserStatus: () => Promise<{ status: string; rejectionReason?: string | null }>;
}
export interface UseAppStatusOptions {
  platformConfig: {
    appStatus?: string;
    supportPhone?: string;
    supportEmail?: string;
    maintenanceMessage?: string;
  };
  platformConfigLoading?: boolean;
  getMe: () => Promise<{
    approvalStatus?: string;
    rejectionReason?: string | null;
  }>;
}
export function useAppStatus(opts: UseAppStatusOptions): AppStatus

Steps
Write useForgotPasswordFlow.ts — Headless hook first, zero JSX. Test all 6 step transitions mentally. tsc --noEmit.

Write ForgotPasswordFlow.tsx — UI using hook from Step 1. Reference rider + vendor ForgotPassword.tsx both. Logo at top. useAuthTheme() for all colors. tsc --noEmit.

Write GuestLanding.tsx — Language cycling + logo + all sections. RTL for Urdu. tsc --noEmit.

Write AuthOverlay.tsx — 4 overlay components. Reference both apps' Overlay.tsx files. tsc --noEmit.

Write useAppStatus.ts — Simple hook. tsc --noEmit.

Update index.ts — Add all new exports (additive only — do NOT remove or change existing lines). tsc --noEmit. Verify all new exports are importable.

Relevant Files
lib/auth-react/src/index.ts
lib/auth-react/src/context/ThemeContext.tsx
lib/auth-react/src/hooks/useRateLimitCountdown.ts
lib/auth-react/src/components/OtpInput.tsx
lib/auth-react/src/components/PasswordInput.tsx
artifacts/rider-app/src/lib/auth/Overlay.tsx
artifacts/vendor-app/src/lib/auth/Overlay.tsx
artifacts/rider-app/src/lib/auth/useAppStatus.ts
artifacts/vendor-app/src/lib/auth/useAppStatus.ts
artifacts/rider-app/src/pages/ForgotPassword.tsx
artifacts/vendor-app/src/pages/ForgotPassword.tsx
artifacts/rider-app/src/pages/GuestLanding.tsx
artifacts/vendor-app/src/pages/GuestLanding.tsx