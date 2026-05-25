import { RegisterScreen, type StepConfig } from "@workspace/auth-react";
import { useLocation } from "wouter";
import { api } from "../api";

const DRAFT_KEY = "rider_reg_draft";

const riderSteps: StepConfig[] = [
  {
    id: "phone-otp",
    title: "Phone Verification",
    subtitle: "Enter your phone number to get started",
    fields: [
      { id: "phone", type: "phone", label: "Phone number", placeholder: "03XXXXXXXXX", required: true },
      { id: "otp", type: "otp", label: "OTP", required: true },
    ],
  },
  {
    id: "personal",
    title: "Personal Details",
    subtitle: "Tell us about yourself",
    fields: [
      { id: "fullName", type: "text", label: "Full Name", placeholder: "Enter full name", required: true },
      { id: "username", type: "text", label: "Username", placeholder: "Optional username" },
      {
        id: "cnic",
        type: "text",
        label: "CNIC",
        placeholder: "XXXXX-XXXXXXX-X",
        validate: (v) => {
          const s = String(v ?? "").trim();
          if (s && !/^\d{5}-\d{7}-\d{1}$/.test(s)) return "CNIC must be in format XXXXX-XXXXXXX-X";
          return null;
        },
      },
    ],
  },
  {
    id: "vehicle",
    title: "Vehicle Information",
    subtitle: "Details about your vehicle",
    fields: [
      {
        id: "vehicleType",
        type: "select",
        label: "Vehicle Type",
        required: true,
        options: ["Bike", "Car", "Rickshaw", "Van", "Truck"].map((v) => ({ value: v, label: v })),
      },
      { id: "plateNumber", type: "text", label: "Plate Number", placeholder: "e.g. AJK-1234", required: true },
      { id: "licenseNumber", type: "text", label: "License Number", placeholder: "Driving license no.", required: true },
    ],
  },
  {
    id: "documents",
    title: "Upload Documents",
    subtitle: "Provide document photo URLs for KYC",
    fields: [
      { id: "vehiclePhoto", type: "text", label: "Vehicle Photo URL", required: true },
      { id: "licensePhoto", type: "text", label: "License Photo URL", required: true },
      { id: "cnicFrontPhoto", type: "text", label: "CNIC Front Photo URL", required: true },
      { id: "cnicBackPhoto", type: "text", label: "CNIC Back Photo URL", required: true },
    ],
  },
  {
    id: "password",
    title: "Set Password",
    subtitle: "Secure your account",
    fields: [
      { id: "password", type: "password", label: "Password", required: true },
      { id: "confirmPassword", type: "confirm-password", label: "Confirm Password", required: true },
      { id: "terms", type: "checkbox", label: "I agree to the Terms & Conditions", required: true },
    ],
  },
];

export interface RegisterWizardProps {
  onDone?: () => void;
}

export function RegisterWizard({ onDone }: RegisterWizardProps) {
  const [, navigate] = useLocation();

  return (
    <RegisterScreen
      role="rider"
      steps={riderSteps}
      onSubmit={async (data) => {
        try {
          await api.registerRider(data as Parameters<typeof api.registerRider>[0]);
          localStorage.removeItem(DRAFT_KEY);
          onDone?.();
          navigate("/login");
          return { success: true };
        } catch (e: unknown) {
          return { success: false, error: e instanceof Error ? e.message : "Registration failed" };
        }
      }}
      onDataChange={(key, value) => {
        try {
          const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "{}") as Record<string, unknown>;
          const safeDraft = { ...draft, [key]: value };
          delete safeDraft.password;
          delete safeDraft.confirmPassword;
          delete safeDraft.otp;
          delete safeDraft.cnic;
          localStorage.setItem(DRAFT_KEY, JSON.stringify(safeDraft));
        } catch {
          /* non-fatal */
        }
      }}
      initialData={(() => {
        try {
          return JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "{}") as Record<string, unknown>;
        } catch {
          return {};
        }
      })()}
    />
  );
}
