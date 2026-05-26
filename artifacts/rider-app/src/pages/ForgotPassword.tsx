import { ForgotPasswordFlow, ThemeProvider, useAuthTheme } from "@workspace/auth-react";
import { useRef } from "react";
import { useLocation } from "wouter";
import { api } from "../lib/api";
import { riderTheme } from "../lib/auth/theme";

function BackToLoginLink() {
  const theme = useAuthTheme();
  const [, navigate] = useLocation();
  return (
    <div style={{ textAlign: "center", padding: "0 0 28px", marginTop: -4 }}>
      <span style={{ color: theme.textMuted, fontSize: 14 }}>
        Remember your password?{" "}
        <a
          href="/login"
          onClick={(e) => { e.preventDefault(); navigate("/login"); }}
          style={{ color: theme.primary, fontWeight: 600, textDecoration: "none" }}
        >
          Sign in
        </a>
      </span>
    </div>
  );
}

export default function ForgotPassword() {
  const [, navigate] = useLocation();
  /*
   * Capture resetToken and newPassword as they flow through the shared flow
   * so that the twoFactorVerify callback can complete the reset with the TOTP
   * code instead of re-calling the standalone /auth/2fa/verify endpoint.
   */
  const resetRef = useRef({ resetToken: "", newPassword: "" });

  return (
    <ThemeProvider role="rider" theme={riderTheme}>
      <ForgotPasswordFlow
        role="rider"
        logoSrc="/ajkmart-logo.png"
        logoAlt="AJKMart"
        api={{
          forgotPassword: (data) =>
            api.forgotPassword(
              (data.phone
                ? { method: "phone", phone: data.phone }
                : { method: "email", email: data.email as string }
              ) as Parameters<typeof api.forgotPassword>[0]
            ),
          verifyResetOtp: async (data) => {
            const res = (await api.verifyResetOtp(data)) as { resetToken: string };
            resetRef.current.resetToken = res.resetToken;
            return res;
          },
          resetPassword: async (data) => {
            resetRef.current.newPassword = data.newPassword;
            return api.resetPassword(data as Parameters<typeof api.resetPassword>[0]);
          },
          /* When 2FA is required mid-reset, complete the reset with the TOTP
             code included — do NOT call the login 2FA verify endpoint. */
          twoFactorVerify: async ({ code }) => {
            const { resetToken, newPassword } = resetRef.current;
            return api.resetPassword({
              resetToken,
              newPassword,
              totpCode: code,
            } as Parameters<typeof api.resetPassword>[0]);
          },
        }}
        onSuccess={() => navigate("/login")}
      />
      <BackToLoginLink />
    </ThemeProvider>
  );
}
