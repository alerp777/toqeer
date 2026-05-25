#1 - Phase 1a: Extend LoginScreen in @workspace/auth-react
Critical Agent Rules
ONLY touch lib/auth-react/src/components/LoginScreen.tsx — koi aur file modify mat karo
Har prop addition ke baad immediately tsc --noEmit run karo lib/auth-react mein
Existing props aur behavior UNCHANGED rahen — 100% backwards compatible
Koi hardcoded color ya hex value nahi — sab useAuthTheme() se
Koi any type nahi — strict TypeScript only
Kaam complete hone ke baad is file ko FINAL maano — future mein sirf bug fixes allowed hain
What & Why
Shared LoginScreen (596 lines, lib/auth-react/src/components/LoginScreen.tsx) mein 6 critical features missing hain jo custom rider/vendor screens mein hain. Ye task sirf is ek file ko extend karta hai — koi nayi file nahi banegi.

Phase 1b parallel chal sakti hai — woh different files touch karta hai, koi conflict nahi.

Done Looks Like
LoginScreen.tsx mein yeh nayi optional props add ho gayi hain (sab undefined/false default):
logoSrc?: string — agar diya toh login form ke upar logo image dikhao
logoAlt?: string — logo ka alt text (default: "App Logo")
enableEmailOtp?: boolean — Email tab visible ho "email" mode ke liye
enableMagicLinkModal?: boolean — Magic link modal button dikhao
devOtp?: string — Dev environment mein OTP banner (sirf import.meta.env.DEV === true par render)
loginMethodTabs?: Array<"otp" | "password" | "email"> — Tab order/visibility control
onBiometricEnrollDecline?: () => void — Biometric enrollment prompt ke decline button ke liye
socialLoadingProvider?: "google" | "facebook" | null — Specific provider ka loading state
No existing prop changed — purani LoginScreenProps interface unchanged
tsc --noEmit on lib/auth-react → zero errors
LoginScreen already exported in index.ts — koi index.ts change needed nahi
Implementation Notes
Logo display
Agar logoSrc prop diya gaya toh form ke sabse upar render karo:

<img src={logoSrc} alt={logoAlt ?? "App Logo"} style={{ height: 48, objectFit: "contain", marginBottom: 16 }} />

Sirf agar logoSrc truthy ho — warna koi element render mat karo.

Email OTP tab
enableEmailOtp={true} hone par loginMethodTabs mein "email" option show karo. Email flow ka state: emailAddress, emailOtp, emailOtpSent, emailSending, emailVerifying, emailResendCooldown — separate state, phone OTP state se independent.

Magic link modal
enableMagicLinkModal={true} hone par ek small inline panel show karo (separate modal nahi — inline expand). Email input + "Send Magic Link" button + "Email sent" confirmation state. magicEmail, magicSent, magicSending state.

Dev OTP banner
{devOtp && import.meta.env.DEV && (
  <div style={{ background: theme.primaryLight, border: `1px solid ${theme.primary}`, borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontSize: 13, color: theme.primary }}>
    🔑 Dev OTP: <strong>{devOtp}</strong>
  </div>
)}

Social loading per provider
SocialButtons component ko loadingProvider={socialLoadingProvider} prop pass karo agar SocialButtons accept karta hai. Agar nahi karta — is task mein SocialButtons mat change karo, simply socialLoadingProvider prop receive karo future use ke liye.

Tab switcher
loginMethodTabs default: ["otp", "password"]. Agar enableEmailOtp=true aur "email" tabs mein nahi → automatically append karo. Tab UI: simple pill buttons at top, useAuthTheme() se colors.

Steps
Read full LoginScreen.tsx carefully — Har existing prop, state, aur render block map karo. Notes banao kahan nayi features fit hongi bina existing code ko break kiye.

Add LoginScreenProps new fields — TypeScript interface mein 8 nayi optional props add karo (upar listed). tsc --noEmit run karo — should still pass.

Logo section add karo — Form ke top par logoSrc check karo, conditional <img> render karo. Recheck: koi existing layout break nahi hua.

Tab switcher add karo — loginMethodTabs prop se driven tab UI. OTP/Password existing tabs ko preserve karo, Email tab naya. tsc --noEmit.

Email OTP flow add karo — enableEmailOtp guard se controlled. Rider aur vendor custom LoginScreen files reference karo exact email OTP flow ke liye. tsc --noEmit.

Magic link inline modal add karo — enableMagicLinkModal guard se controlled. tsc --noEmit.

Dev OTP banner add karo — devOtp + import.meta.env.DEV double guard. tsc --noEmit.

Final check — tsc --noEmit clean. Zero any. Zero hardcoded hex. Logo prop works. All existing behavior unchanged.

Relevant Files
lib/auth-react/src/components/LoginScreen.tsx
lib/auth-react/src/context/ThemeContext.tsx
lib/auth-react/src/components/SocialButtons.tsx
artifacts/rider-app/src/lib/auth/LoginScreen.tsx
artifacts/vendor-app/src/lib/auth/LoginScreen.tsx