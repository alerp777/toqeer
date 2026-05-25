#2 - Phase 2: Rider-App Auth Migration
Critical Agent Rules
Phase 1a (Task #1) aur Phase 1b (Task #4) dono complete hone ke baad hi shuru karo
Har file replace karne se pehle 3-step checklist:
 Kya naya wrapper mein pehli wali SAARI functionality cover hai?
 Kya koi import path broken hai?
 tsc --noEmit rider-app mein clean hai?
Teeno checked hone ke baad hi old file content delete karo
Old file COMPLETELY delete karo — "backup" ya "commented-out" code mat chhodna
Koi any type nahi
Koi hardcoded hex value nahi — sab riderTheme tokens se (already injected via ThemeProvider)
Kaam complete hone ke baad in wrapper files ko FINAL maano — future mein sirf bug fixes
What & Why
Rider-app mein 6 custom auth files hain (~4,000 lines duplicate code). Phase 1a+1b ke baad @workspace/auth-react feature-complete hoga. Is task mein:

Logo file copy karo public/ mein
Har custom auth file ko thin wrapper se replace karo
Dead code completely delete karo
Target state: Rider-app mein auth logic zero lines. Sirf config/props/content.

Done Looks Like
File	Before	After
lib/auth/LoginScreen.tsx	1,536 lines (full implementation)	~65 lines (thin wrapper)
lib/auth/RegisterWizard.tsx	954 lines (full implementation)	~85 lines (thin wrapper)
pages/ForgotPassword.tsx	1,014 lines (full implementation)	~45 lines (thin wrapper)
pages/GuestLanding.tsx	915 lines (full implementation)	~55 lines (thin wrapper)
lib/auth/Overlay.tsx	439 lines (full implementation)	~20 lines (re-exports)
lib/auth/useAppStatus.ts	47 lines (custom hook)	~15 lines (re-export)
public/ajkmart-logo.png	missing	✅ copied
tsc --noEmit on artifacts/rider-app → zero errors
All auth flows visually identical to before — same dark gold theme, same UX
Out of Scope — NEVER TOUCH
lib/auth/useAuth.ts — core auth context, business logic
lib/rider-auth.tsx — rider auth provider
lib/api.ts — API client
lib/auth/ThemeContext.tsx — already correct thin re-export
lib/auth/theme.ts — riderTheme tokens
lib/biometric.ts — biometric module
artifacts/api-server/ — no backend changes
artifacts/ajkmart/ — NEVER touch
Rider-Specific Config (Preserve in Wrappers)
Theme
riderTheme from ./lib/auth/theme.ts — gold #F0B90B on dark #0B0E11

LoginScreen config
role="rider"
logoSrc="/ajkmart-logo.png"
logoAlt="AJKMart"
enableBiometric={true}
enableSocial={true}
enableEmailOtp={true}
enableMagicLinkModal={true}
loginMethodTabs={["otp", "password", "email"]}
devOtp={import.meta.env.VITE_ALLOW_DEV_OTP === "true" ? devOtpFromResponse : undefined}

Role guard in onSuccess:

const roles = normalizeRoles(profile);
if (roles.length > 0 && !roles.includes("rider")) {
  showError(`Your account is registered as a ${roles[0]}. This app is for riders only.`);
  return;
}
// store tokens, call login(), navigate("/")

After successful login — biometric enroll check:

// Check if biometric available but not yet enrolled → show BiometricEnrollOverlay
const { isBiometricAvailable, isBiometricEnabled } = await import("../biometric");
if (await isBiometricAvailable() && !(await isBiometricEnabled())) {
  // show biometric enroll prompt
}

RegisterWizard config
5 steps:

phone-otp — Phone number + OTP send/verify
personal — fullName, username, CNIC (13 digits)
vehicle — vehicleType (Bike/Car/Rickshaw/Van/Truck), plateNumber, licenseNumber
documents — vehiclePhoto, licensePhoto, cnicFrontPhoto, cnicBackPhoto (file uploads)
password — password + confirmPassword + terms checkbox
Draft key: rider_reg_draft in localStorage

GuestLanding content
logoSrc="/ajkmart-logo.png"
appName="AJKMart Rider"
role="rider"
// Stats
stats={[
  { v: "₨ 2,400", l: { en: "Avg daily earnings", ur: "اوسط یومیہ آمدن", roman: "Avg roz ki kamai" } },
  { v: "12,000+", l: { en: "Active riders", ur: "فعال رائیڈرز", roman: "Active riders" } },
  { v: "18", l: { en: "Cities covered", ur: "شہر", roman: "Shehar" } },
  { v: "4.8★", l: { en: "App rating", ur: "ایپ ریٹنگ", roman: "App rating" } },
]}
// Features
features={[
  { icon: "⚡", title: { en: "Instant Payouts", ur: "فوری ادائیگی", roman: "Fori Adaigi" }, desc: "...", color: "#F0B90B" },
  { icon: "🗺️", title: { en: "Live Navigation", ur: "لائیو نیویگیشن", roman: "Live Navigation" }, desc: "...", color: "#22C55E" },
  { icon: "⏰", title: { en: "Flexible Hours", ur: "لچکدار اوقات", roman: "Flexible Waqt" }, desc: "...", color: "#3B82F6" },
  { icon: "🎁", title: { en: "Bonus Rewards", ur: "بونس انعام", roman: "Bonus Inaam" }, desc: "...", color: "#A855F7" },
]}
heroTitle={{ en: "Earn More. Ride Free.", ur: "زیادہ کمائیں۔ آزاد سفر کریں۔", roman: "Zyada Kamayen. Azad Safar karen." }}

Steps
Step 1 — Copy AJKMart Logo
Copy attached_assets/my_1779694670644.png → artifacts/rider-app/public/ajkmart-logo.png This makes logo available at /ajkmart-logo.png URL in the app.

Step 2 — Read & Audit Rider LoginScreen
Read full artifacts/rider-app/src/lib/auth/LoginScreen.tsx (1,536 lines). Create a mental checklist of every function, every handler, every state variable. Confirm shared LoginScreen (after Phase 1a) covers each one. Then write the thin wrapper.

Step 3 — LoginScreen Thin Wrapper
Rewrite artifacts/rider-app/src/lib/auth/LoginScreen.tsx as ~65-line wrapper:

Import LoginScreen from @workspace/auth-react
Pass all rider config (role, logoSrc, enables, callbacks)
onSuccess: role guard → fetchRiderProfile() call → api.storeTokens() → login() → navigate("/")
Social callbacks: onGoogle, onFacebook (call api.socialAuth())
Biometric: onBiometricSuccess handler
Run tsc --noEmit — fix all errors
Step 4 — RegisterWizard Thin Wrapper
Rewrite artifacts/rider-app/src/lib/auth/RegisterWizard.tsx as ~85-line wrapper:

Import RegisterScreen from @workspace/auth-react
Define riderSteps: StepConfig[] array inline (5 steps per config above)
onSubmit: calls api.riderRegister(data) → navigate to login
onDataChange: saves to localStorage.setItem("rider_reg_draft", JSON.stringify(data))
Run tsc --noEmit
Step 5 — ForgotPassword Thin Wrapper
Rewrite artifacts/rider-app/src/pages/ForgotPassword.tsx as ~45-line wrapper:

Import ForgotPasswordFlow from @workspace/auth-react
Pass role="rider", logoSrc="/ajkmart-logo.png", rider API callbacks
onSuccess: navigate to /login
Run tsc --noEmit
Step 6 — GuestLanding Thin Wrapper
Rewrite artifacts/rider-app/src/pages/GuestLanding.tsx as ~55-line wrapper:

Import GuestLanding from @workspace/auth-react
Pass all rider content (logoSrc, appName, stats, features, heroTitle — all trilingual)
onLogin: navigate to /login, onRegister: navigate to /register
Run tsc --noEmit
Step 7 — Replace Overlay.tsx
Rewrite artifacts/rider-app/src/lib/auth/Overlay.tsx as ~20 lines:

export { PendingOverlay, RejectedOverlay, MaintenanceOverlay, BiometricEnrollOverlay } from "@workspace/auth-react";

Run tsc --noEmit. Verify all Overlay usages in App.tsx/pages still compile.

Step 8 — Replace useAppStatus.ts
Rewrite artifacts/rider-app/src/lib/auth/useAppStatus.ts as ~15 lines:

import { useAppStatus as _useAppStatus } from "@workspace/auth-react";
import { usePlatformConfig } from "../useConfig";
import { api } from "../api";
export type { AppStatus, UserStatus } from "@workspace/auth-react";
export function useAppStatus() {
  const { config, isLoading } = usePlatformConfig();
  return _useAppStatus({
    platformConfig: config.platform,
    platformConfigLoading: isLoading,
    getMe: api.getMe,
  });
}

Run tsc --noEmit.

Step 9 — Final Verification
tsc --noEmit on artifacts/rider-app — zero errors required
Count lines: all 6 wrapper files should be under 100 lines each
Grep for old logic patterns in wrapper files: useState\|useEffect\|fetch\|axios should be minimal — only in callbacks, not in the wrappers themselves
Relevant Files
artifacts/rider-app/src/lib/auth/LoginScreen.tsx
artifacts/rider-app/src/lib/auth/RegisterWizard.tsx
artifacts/rider-app/src/lib/auth/Overlay.tsx
artifacts/rider-app/src/lib/auth/useAppStatus.ts
artifacts/rider-app/src/lib/auth/ThemeContext.tsx
artifacts/rider-app/src/lib/auth/theme.ts
artifacts/rider-app/src/lib/auth/useAuth.ts
artifacts/rider-app/src/pages/ForgotPassword.tsx
artifacts/rider-app/src/pages/GuestLanding.tsx
artifacts/rider-app/src/lib/api.ts
artifacts/rider-app/src/lib/rider-auth.tsx
artifacts/rider-app/src/App.tsx
artifacts/rider-app/src/lib/biometric.ts
lib/auth-react/src/index.ts
lib/auth-react/src/components/LoginScreen.tsx
lib/auth-react/src/components/RegisterScreen.tsx
lib/auth-react/src/components/GuestLanding.tsx
lib/auth-react/src/components/ForgotPasswordFlow.tsx
lib/auth-react/src/components/AuthOverlay.tsx
lib/auth-react/src/hooks/useAppStatus.ts
Dependencies

Phase 1a: Extend LoginScreen in @workspace/auth-react
Open task

Phase 1b: New Auth Components in @workspace/auth-react
