import { ForgotPasswordFlow } from "@workspace/auth-react";
import { useLocation } from "wouter";
import { api } from "../lib/api";

export default function ForgotPassword() {
  const [, navigate] = useLocation();

  return (
    <ForgotPasswordFlow
      role="rider"
      logoSrc="/ajkmart-logo.png"
      api={{
        forgotPassword: (data) =>
          api.forgotPassword(
            (data.phone
              ? { method: "phone", phone: data.phone }
              : { method: "email", email: data.email }) as Parameters<typeof api.forgotPassword>[0]
          ),
        verifyResetOtp: (data) =>
          api.verifyResetOtp(data) as Promise<{ resetToken: string }>,
        resetPassword: (data) =>
          api.resetPassword(
            data as Parameters<typeof api.resetPassword>[0]
          ),
        twoFactorVerify: ({ code }) =>
          api.twoFactorVerify({
            code,
            tempToken: "",
          }) as Promise<unknown>,
      }}
      onSuccess={() => navigate("/login")}
    />
  );
}
