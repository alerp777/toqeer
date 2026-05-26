<<<<<<< Updated upstream
import {
  RegisterScreen,
  SubmittedScreen,
  ThemeProvider,
  type StepComponentProps,
  type StepConfig,
} from "@workspace/auth-react";
=======
import { RegisterScreen, ThemeProvider, type StepConfig } from "@workspace/auth-react";
import { CNIC_REGEX } from "@workspace/phone-utils";
>>>>>>> Stashed changes
import { useState } from "react";
import { useLocation } from "wouter";
import { api } from "../api";

const DRAFT_KEY = "rider_reg_draft";

async function fileToDataUrl(file: unknown): Promise<string> {
  if (!(file instanceof File)) return String(file ?? "");
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ── Document upload step component ─────────────────────────────────── */
const DOC_FIELDS: Array<{ id: string; label: string }> = [
  { id: "vehiclePhoto", label: "Vehicle Photo" },
  { id: "licensePhoto", label: "License Photo" },
  { id: "cnicFrontPhoto", label: "CNIC Front Photo" },
  { id: "cnicBackPhoto", label: "CNIC Back Photo" },
];

function DocumentUploadStep({ data, onChange }: StepComponentProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {DOC_FIELDS.map(({ id, label }) => {
        const file = data[id] instanceof File ? (data[id] as File) : null;
        return (
          <div key={id}>
            <label
              style={{
                display: "block",
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                marginBottom: 6,
                color: "rgba(255,255,255,0.5)",
              }}
            >
              {label} *
            </label>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                height: 48,
                padding: "0 14px",
                borderRadius: 12,
                background: "rgba(255,255,255,0.04)",
                border: "1.5px solid rgba(255,255,255,0.10)",
                color: file ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.35)",
                fontSize: 14,
                cursor: "pointer",
                transition: "border-color 0.15s",
                boxSizing: "border-box",
                overflow: "hidden",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.5 }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {file ? file.name : "Choose image file…"}
              </span>
              <input
                type="file"
                accept="image/*"
                style={{ position: "absolute", opacity: 0, width: 0, height: 0 }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onChange(id, f);
                }}
              />
            </label>
          </div>
        );
      })}
    </div>
  );
}

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
        placeholder: "00000-0000000-0",
        validate: (v) => {
          const s = String(v ?? "").trim();
          if (s && !CNIC_REGEX.test(s)) return "CNIC must be in format XXXXX-XXXXXXX-X";
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
        options: ["bike", "car", "rickshaw", "van"].map((v) => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) })),
      },
      { id: "plateNumber", type: "text", label: "Plate Number", placeholder: "e.g. AJK-1234", required: true },
      { id: "licenseNumber", type: "text", label: "License Number", placeholder: "Driving license no.", required: true },
    ],
  },
  {
    id: "documents",
    title: "Upload Documents",
    subtitle: "Upload clear photos of your documents for KYC",
    component: DocumentUploadStep,
    validate: (data) => {
      for (const { id, label } of DOC_FIELDS) {
        if (!data[id]) return `${label} is required.`;
      }
      return null;
    },
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
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <ThemeProvider role="rider">
        <SubmittedScreen
          onGoToLogin={() => navigate("/login")}
          message="Our team will review your details within 24–48 hours. You'll receive an SMS once your account is approved and ready to ride."
        />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider role="rider">
      <RegisterScreen
        role="rider"
        steps={riderSteps}
        onSubmit={async (raw) => {
          try {
            const d = raw as Record<string, unknown>;
            const [vehiclePhotoUrl, licensePhotoUrl, cnicFrontUrl, cnicBackUrl] = await Promise.all([
              fileToDataUrl(d.vehiclePhoto),
              fileToDataUrl(d.licensePhoto),
              fileToDataUrl(d.cnicFrontPhoto),
              fileToDataUrl(d.cnicBackPhoto),
            ]);
            await api.registerRider({
              phone: d.phone as string,
              otp: d.otp as string,
              password: d.password as string,
              vehicleType: d.vehicleType as string,
              name: String(d.fullName ?? "").trim(),
              vehiclePlate: String(d.plateNumber ?? "").trim(),
              drivingLicense: String(d.licenseNumber ?? "").trim(),
              vehiclePhoto: vehiclePhotoUrl,
              documents: JSON.stringify({
                licensePhoto: licensePhotoUrl,
                cnicFrontPhoto: cnicFrontUrl,
                cnicBackPhoto: cnicBackUrl,
              }),
            } as Parameters<typeof api.registerRider>[0]);
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
            if (value instanceof File) return;
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
