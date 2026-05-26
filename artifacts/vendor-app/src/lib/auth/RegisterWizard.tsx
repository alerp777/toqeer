import { RegisterScreen, SubmittedScreen, ThemeProvider, useAuthTheme } from "@workspace/auth-react";
import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { api } from "../api";
import { getVendorAuthConfig, usePlatformConfig } from "../useConfig";
import { useAuth } from "./useAuth";
import { vendorTheme } from "./theme";
import {
  DRAFT_KEY, DRAFT_TTL_KEY,
  loadDraft, saveDraft, fileToDataUrl, getVendorSteps, vendorSteps, registerOtpResender, markOtpSent,
} from "./vendor-register-steps";

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
  const { config } = usePlatformConfig();
  const auth = getVendorAuthConfig(config);
  const [submitted, setSubmitted] = useState(false);

  const steps = useMemo(
    () => getVendorSteps({ phoneEnabled: auth.phoneOtp, emailEnabled: auth.emailOtp }),
    [auth.phoneOtp, auth.emailOtp]
  );

  if (submitted) {
    return <SubmittedScreen onGoToLogin={() => navigate("/login")} />;
  }

  return (
    <ThemeProvider role="vendor" theme={vendorTheme}>
      <RegisterScreen
        role="vendor"
        accent={vendorTheme.primary}
        accentText="#ffffff"
        steps={steps}
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
    </ThemeProvider>
  );
}
