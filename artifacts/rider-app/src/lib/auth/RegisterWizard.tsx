import { RegisterScreen, ThemeProvider, type StepConfig } from "@workspace/auth-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { api } from "../api";
import { riderTheme } from "./theme";

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

function SubmittedScreen({ onGoToLogin }: { onGoToLogin: () => void }) {
  return (
    <div style={{
      minHeight: "100vh",
      background: riderTheme.background,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px 16px",
      fontFamily: "Inter, system-ui, sans-serif",
    }}>
      <div style={{
        width: "100%",
        maxWidth: 420,
        background: riderTheme.surface,
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
          <h2 style={{ fontSize: 22, fontWeight: 800, color: riderTheme.text, margin: "0 0 8px" }}>
            Application Submitted!
          </h2>
          <p style={{ fontSize: 14, color: riderTheme.textMuted, margin: 0, lineHeight: 1.6 }}>
            Our team will review your details within 24–48 hours. You’ll receive
            an SMS once your account is approved and ready to ride.
          </p>
        </div>
        <div style={{
          background: `${riderTheme.primary}18`,
          border: `1px solid ${riderTheme.primary}40`,
          borderRadius: 12,
          padding: "12px 16px",
          width: "100%",
        }}>
          <p style={{ fontSize: 13, color: riderTheme.textMuted, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
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
            background: riderTheme.primary,
            color: riderTheme.background,
            fontWeight: 700,
            fontSize: 15,
            cursor: "pointer",
            marginTop: 4,
            transition: "opacity 0.15s, filter 0.15s",
          }}
        >
          Go to Sign In
        </button>
      </div>
    </div>
  );
}

export function RegisterWizard({ onDone }: RegisterWizardProps) {
  const [, navigate] = useLocation();
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return <SubmittedScreen onGoToLogin={() => navigate("/login")} />;
  }

  return (
    <ThemeProvider role="rider">
      <RegisterScreen
        role="rider"
        steps={riderSteps}
        onSubmit={async (raw) => {
        try {
          const d = raw as Record<string, unknown>;
          /* Map wizard field IDs → API-expected keys */
          const { fullName, plateNumber, licenseNumber, licensePhoto, cnicFrontPhoto, cnicBackPhoto, ...rest } = d;
          await api.registerRider({
            ...(rest as Omit<Parameters<typeof api.registerRider>[0],
              "name" | "vehiclePlate" | "drivingLicense" | "vehiclePhoto" | "documents">),
            name: String(fullName ?? "").trim(),
            vehiclePlate: String(plateNumber ?? "").trim(),
            drivingLicense: String(licenseNumber ?? "").trim(),
            vehiclePhoto: String(d.vehiclePhoto ?? ""),
            documents: JSON.stringify({ licensePhoto, cnicFrontPhoto, cnicBackPhoto }),
          });
          localStorage.removeItem(DRAFT_KEY);
          onDone?.();
          setSubmitted(true);
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
    </ThemeProvider>
  );
}
