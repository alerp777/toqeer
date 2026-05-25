Replaces ~4,600 lines of duplicate auth code with thin wrappers over @workspace/auth-react.
All auth logic delegates to the shared library; vendor-app contains only config/props/content.

Architecture:

vendor-register-steps.tsx: step config (vendorSteps[]), draft helpers, file-to-dataUrl,
DocumentsStep and OtpPasswordStep UI components (pure form UI, zero auth logic).
All colors use AuthTheme tokens (t.primary, t.error, t.primaryLight, t.border, etc.);
no hardcoded hex values.
RegisterWizard.tsx: 60-line thin wrapper — imports config + helpers from vendor-register-steps,
passes onOtpRequest (sendOtp) and onSubmit (register) to RegisterScreen.
RegisterScreen fires onOtpRequest automatically when advancing to the OtpPasswordStep
component — no duplicated OTP send logic in the step component itself.
Key design decisions:

OTP step split: OtpPasswordStep is pure form UI. RegisterScreen handles OTP sending via
onOtpRequest when transitioning to the component-based step. onSubmit is called correctly
on the component-based last step (not onComplete, which fires for field-based OTP steps).
Rejection reason: getRejectionReason() handles both approvalNote (task spec) and
rejectionReason (shared library) with graceful fallback.
Role normalization: handles both roles[] array and legacy role string shapes.
Files changed (lines before → after):

public/ajkmart-logo.png: missing → ✅ copied from rider-app
lib/auth/LoginScreen.tsx: 1,769 → 133 lines
lib/auth/RegisterWizard.tsx: 1,291 → 60 lines
lib/auth/vendor-register-steps.tsx: new, 179 lines (step config + UI helpers)
pages/ForgotPassword.tsx: 948 → 25 lines
pages/GuestLanding.tsx: 1,013 → 54 lines
lib/auth/Overlay.tsx: 393 → 12 lines
lib/auth/useAppStatus.ts: 47 → 17 lines