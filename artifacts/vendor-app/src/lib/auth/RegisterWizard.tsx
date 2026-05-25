import { RegisterScreen } from "@workspace/auth-react";
import { useLocation } from "wouter";
import { api } from "../api";
import { useAuth } from "./useAuth";
import {
  DRAFT_KEY, DRAFT_TTL_KEY,
  loadDraft, saveDraft, fileToDataUrl, vendorSteps,
} from "./vendor-register-steps";

export function RegisterWizard() {
  const [, navigate] = useLocation();
  const { sendOtp, register } = useAuth();

  return (
    <RegisterScreen
      role="vendor"
      steps={vendorSteps}
      initialData={loadDraft()}
      onDataChange={saveDraft}
      onOtpRequest={async (phone) => {
        const result = await sendOtp(phone);
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
          } catch { /* ignore */ }
        }
        return result;
      }}
      onDone={() => navigate("/login")}
    />
  );
}
