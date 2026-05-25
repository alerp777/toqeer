import { RegisterScreen, ThemeProvider } from "@workspace/auth-react";
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
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#060A14",
      padding: "24px 16px",
    }}>
      <div style={{
        width: "100%",
        maxWidth: 420,
        background: "#0F1827",
        borderRadius: 20,
        padding: "40px 28px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 20,
        textAlign: "center",
      }}>
        <div style={{ fontSize: 56, lineHeight: 1 }}>🎉</div>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "#E2E8F4", margin: "0 0 8px" }}>
            Application Submitted!
          </h2>
          <p style={{ fontSize: 14, color: "#8B95A9", margin: 0, lineHeight: 1.6 }}>
            Our team will review your details within 24–48 hours. You'll receive
            an SMS once your account is approved and ready to use.
          </p>
        </div>
        <div style={{
          background: "rgba(26,86,219,0.1)",
          border: "1px solid rgba(26,86,219,0.25)",
          borderRadius: 12,
          padding: "12px 16px",
          width: "100%",
        }}>
          <p style={{ fontSize: 13, color: "#8B95A9", margin: 0 }}>
            📱 Keep an eye on your registered phone number for status updates.
          </p>
        </div>
        <button
          onClick={onGoToLogin}
          style={{
            width: "100%",
            padding: "14px",
            borderRadius: 12,
            border: "none",
            background: "#1A56DB",
            color: "#fff",
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

export function RegisterWizard() {
  const [, navigate] = useLocation();
  const { sendOtp, register } = useAuth();
  const [submitted, setSubmitted] = useState(false);
  const logoSrc = `${import.meta.env.BASE_URL}ajkmart-logo.png`;

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
          <img
            src={logoSrc}
            alt="AJKMart Vendor"
            style={{ height: 32, objectFit: "contain" }}
          />
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
        <div style={{
          textAlign: "center",
          padding: "0 0 24px",
          marginTop: -8,
        }}>
          <span style={{ color: "#8B95A9", fontSize: 14 }}>
            Already have an account?{" "}
            <a
              href="/login"
              onClick={(e) => { e.preventDefault(); navigate("/login"); }}
              style={{ color: "#1A56DB", fontWeight: 600, textDecoration: "none" }}
            >
              Sign in
            </a>
          </span>
        </div>
      </div>
    </ThemeProvider>
  );
}
