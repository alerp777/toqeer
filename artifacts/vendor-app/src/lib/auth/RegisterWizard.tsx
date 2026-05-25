import { RegisterScreen, ThemeProvider, useAuthTheme } from "@workspace/auth-react";
import { AjkmartLogo } from "@workspace/ui/components/AjkmartLogo";
import { useState } from "react";
import { useLocation } from "wouter";
import { api } from "../api";
import { useAuth } from "./useAuth";
import { vendorTheme } from "./theme";
import {
  DRAFT_KEY, DRAFT_TTL_KEY,
  loadDraft, saveDraft, fileToDataUrl, vendorSteps, registerOtpResender, markOtpSent,
} from "./vendor-register-steps";

function SubmittedScreen({ onGoToLogin }: { onGoToLogin: () => void }) {
  const theme = useAuthTheme();
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: theme.background,
      padding: "24px 16px",
    }}>
      <div style={{
        width: "100%",
        maxWidth: 420,
        background: theme.surface,
        borderRadius: 20,
        padding: "40px 28px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 20,
        textAlign: "center",
      }}>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="9 12 11 14 15 10" />
          </svg>
        </div>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: theme.text, margin: "0 0 8px" }}>
            Application Submitted!
          </h2>
          <p style={{ fontSize: 14, color: theme.textMuted, margin: 0, lineHeight: 1.6 }}>
            Our team will review your details within 24–48 hours. You'll receive
            an SMS once your account is approved and ready to use.
          </p>
        </div>
        <div style={{
          background: `${theme.primary}18`,
          border: `1px solid ${theme.primary}40`,
          borderRadius: 12,
          padding: "12px 16px",
          width: "100%",
        }}>
          <p style={{ fontSize: 13, color: theme.textMuted, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
              <line x1="12" y1="18" x2="12.01" y2="18" />
            </svg>
            Keep an eye on your registered phone number for status updates.
          </p>
        </div>
        <button
          onClick={onGoToLogin}
          style={{
            width: "100%",
            padding: "14px",
            borderRadius: 12,
            border: "none",
            background: theme.primary,
            color: theme.onPrimary,
            fontWeight: 700,
            fontSize: 15,
            cursor: "pointer",
            marginTop: 4,
          }}
        >
          Go to Sign In
        </button>
      </div>
    </div>
  );
}

function SignInFooter({ onNavigate }: { onNavigate: () => void }) {
  const theme = useAuthTheme();
  return (
    <div style={{
      textAlign: "center",
      padding: "0 0 24px",
      marginTop: -8,
    }}>
      <span style={{ color: theme.textMuted, fontSize: 14 }}>
        Already have an account?{" "}
        <a
          href="/login"
          onClick={(e) => { e.preventDefault(); onNavigate(); }}
          style={{ color: theme.primary, fontWeight: 600, textDecoration: "none" }}
        >
          Sign in
        </a>
      </span>
    </div>
  );
}

export function RegisterWizard() {
  const [, navigate] = useLocation();
  const { sendOtp, register } = useAuth();
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return <SubmittedScreen onGoToLogin={() => navigate("/login")} />;
  }

  return (
    <ThemeProvider role="vendor" theme={vendorTheme}>
      <div style={{ position: "relative" }}>
        <div style={{
          position: "absolute",
          top: 18,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 10,
          pointerEvents: "none",
        }}>
          <AjkmartLogo variant="compact" size={22} theme="light" />
        </div>
        <RegisterScreen
          role="vendor"
          accent={vendorTheme.primary}
          accentText="#ffffff"
          steps={vendorSteps}
          initialData={loadDraft()}
          onDataChange={saveDraft}
          className="vendor-register-screen"
          onOtpRequest={async (phone) => {
            registerOtpResender(sendOtp);
            const result = await sendOtp(phone);
            if (result.success) {
              markOtpSent();
            }
            return { success: result.success, error: result.error };
          }}
          onSubmit={async (data) => {
            const [cnicFront, cnicBack, storeFront] = await Promise.all([
              fileToDataUrl(data.cnicFrontPhoto),
              fileToDataUrl(data.cnicBackPhoto),
              fileToDataUrl(data.storeFrontPhoto),
            ]);
            const documents = (cnicFront || cnicBack || storeFront)
              ? JSON.stringify({ cnicFront, cnicBack, storeFront })
              : undefined;
            const result = await register({
              phone: data.phone as string,
              storeName: data.storeName as string,
              storeCategory: data.storeCategory as string,
              name: data.ownerName as string,
              city: data.city as string,
              address: data.address as string | undefined,
              cnic: data.cnic as string | undefined,
              bankName: data.bankName as string | undefined,
              bankAccount: data.bankAccount as string | undefined,
              bankAccountTitle: data.bankAccountTitle as string | undefined,
              password: data.password as string,
              otp: data.otp as string,
              documents,
              acceptedTermsVersion: "1.0",
            });
            if (result.success) {
              try {
                localStorage.removeItem(DRAFT_KEY);
                localStorage.removeItem(DRAFT_TTL_KEY);
              } catch { }
            }
            return result;
          }}
          onDone={() => setSubmitted(true)}
        />
        <SignInFooter onNavigate={() => navigate("/login")} />
      </div>
    </ThemeProvider>
  );
}
