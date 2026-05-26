import { RegisterScreen, SubmittedScreen, ThemeProvider, useAuthTheme } from "@workspace/auth-react";
import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { api } from "../api";
import { useRiderAuthConfig } from "../AuthConfigContext";
import { useAuthOps } from "./useAuth";
import { riderTheme } from "./theme";
import {
  DRAFT_KEY, DRAFT_TTL_KEY,
  loadDraft, saveDraft, fileToDataUrl, getRiderSteps, riderSteps, registerOtpResender, markOtpSent,
} from "./rider-register-steps";

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

export interface RegisterWizardProps {
  onDone?: () => void;
}

export function RegisterWizard({ onDone }: RegisterWizardProps) {
  const [, navigate] = useLocation();
  const { sendOtp, register } = useAuthOps();
  const authConfig = useRiderAuthConfig();
  const [submitted, setSubmitted] = useState(false);

  const steps = useMemo(
    () => getRiderSteps({ phoneEnabled: authConfig.phoneEnabled, emailEnabled: authConfig.emailEnabled }),
    [authConfig.phoneEnabled, authConfig.emailEnabled]
  );

  if (submitted) {
    return (
      <ThemeProvider role="rider" theme={riderTheme}>
        <SubmittedScreen
          onGoToLogin={() => navigate("/login")}
          message="Our team will review your details within 24–48 hours. You'll receive an SMS once your account is approved and ready to ride."
        />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider role="rider" theme={riderTheme}>
      <RegisterScreen
        role="rider"
        accent={riderTheme.primary}
        accentText="#0B0E11"
        steps={steps}
        initialData={loadDraft()}
        onDataChange={saveDraft}
        className="rider-register-screen"
        onOtpRequest={async (phone) => {
          registerOtpResender(sendOtp);
          const result = await sendOtp(phone);
          if (result.success) {
            markOtpSent();
          }
          return { success: result.success, error: result.error };
        }}
        onSubmit={async (data) => {
          /* Serialize photo conversions one at a time to avoid OOM on budget devices
             with 4 concurrent FileReader operations. Validate each result before
             submitting so the rider gets a specific error rather than a broken upload. */
          const vehiclePhotoUrl = await fileToDataUrl(data.vehiclePhoto);
          const licensePhotoUrl = await fileToDataUrl(data.licensePhoto);
          const cnicFrontUrl = await fileToDataUrl(data.cnicFrontPhoto);
          const cnicBackUrl = await fileToDataUrl(data.cnicBackPhoto);

          if (!vehiclePhotoUrl || !licensePhotoUrl || !cnicFrontUrl || !cnicBackUrl) {
            return {
              success: false,
              error: "Photo upload failed, please retake the photo and try again",
            };
          }

          /* Guard OTP / password fields — these steps may be absent if phone or
             OTP-password steps are removed from the wizard configuration. */
          const result = await register({
            phone: data.phone as string,
            otp: (data.otp ?? "") as string,
            password: (data.password ?? "") as string,
            name: String(data.fullName ?? "").trim(),
            username: data.username ? String(data.username).trim() : undefined,
            cnic: data.cnic ? String(data.cnic).trim() : undefined,
            vehicleType: data.vehicleType as string,
            vehiclePlate: String(data.plateNumber ?? "").trim(),
            drivingLicense: String(data.licenseNumber ?? "").trim(),
            vehiclePhoto: vehiclePhotoUrl ?? "",
            documents: JSON.stringify({
              licensePhoto: licensePhotoUrl,
              cnicFrontPhoto: cnicFrontUrl,
              cnicBackPhoto: cnicBackUrl,
            }),
          } as Parameters<typeof api.registerRider>[0]);

          if (result.success) {
            try {
              localStorage.removeItem(DRAFT_KEY);
              localStorage.removeItem(DRAFT_TTL_KEY);
            } catch { }
          }
          return result;
        }}
        onDone={() => {
          onDone?.();
          setSubmitted(true);
        }}
      />
      <SignInFooter onNavigate={() => navigate("/login")} />
    </ThemeProvider>
  );
}
