/**
 * vendor-register-steps.tsx — vendor-app
 *
 * Step components and config for vendor RegisterWizard.
 * No auth logic — pure form UI and step configuration.
 * OTP sending is delegated to RegisterScreen via onOtpRequest.
 */
import type { StepConfig, StepComponentProps } from "@workspace/auth-react";
import { useAuthTheme } from "@workspace/auth-react";
import { useRef, useState } from "react";
import { isValidCnic, isValidPhone } from "@workspace/phone-utils";
import { PAKISTAN_CITIES } from "@workspace/service-constants";

/* ─── Draft helpers ────────────────────────────────────────────────── */
export const DRAFT_KEY = "vendor_reg_draft";
export const DRAFT_TTL_KEY = "vendor_reg_draft_ts";
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

export function loadDraft(): Record<string, unknown> {
  try {
    const ts = Number(localStorage.getItem(DRAFT_TTL_KEY) ?? 0);
    if (Date.now() - ts > DRAFT_TTL_MS) return {};
    return JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "{}") as Record<string, unknown>;
  } catch { return {}; }
}

export function saveDraft(key: string, value: unknown) {
  try {
    if (key === "password" || key === "confirmPassword") return;
    if (value instanceof File) return;
    const draft = loadDraft();
    draft[key] = value;
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    localStorage.setItem(DRAFT_TTL_KEY, String(Date.now()));
  } catch { /* ignore */ }
}

export async function fileToDataUrl(file: unknown): Promise<string | undefined> {
  if (!(file instanceof File)) return undefined;
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ─── Step config ──────────────────────────────────────────────────── */
const STORE_CATS = [
  "Grocery", "Restaurant", "Bakery", "Pharmacy", "Electronics", "Clothing",
  "General Store", "Fast Food", "Fruits & Vegetables", "Dairy", "Meat & Poultry", "Other",
];

export const vendorSteps: StepConfig[] = [
  {
    id: "store-info",
    title: "Store Information",
    subtitle: "Tell us about your business",
    fields: [
      { id: "storeName", type: "text", label: "Store Name", required: true, placeholder: "Ali's Grocery" },
      { id: "storeCategory", type: "select", label: "Category", required: true, options: STORE_CATS.map((c) => ({ value: c, label: c })) },
      { id: "ownerName", type: "text", label: "Owner Name", required: true, placeholder: "Full name" },
      { id: "city", type: "select", label: "City", required: true, options: [...PAKISTAN_CITIES].map((c) => ({ value: c, label: c })) },
      { id: "address", type: "text", label: "Address", placeholder: "Street address" },
    ],
    validate: (d) =>
      !d.storeName ? "Store name is required" :
      !d.storeCategory ? "Category is required" :
      !d.ownerName ? "Owner name is required" :
      !d.city ? "City is required" : null,
  },
  { id: "documents", title: "Contact & Documents", component: DocumentsStep,
    validate: (d) => !d.phone ? "Phone number is required" : null },
  {
    id: "bank",
    title: "Bank Details",
    subtitle: "For receiving payments (optional)",
    fields: [
      { id: "bankName", type: "text", label: "Bank Name", placeholder: "e.g. HBL" },
      { id: "bankAccountTitle", type: "text", label: "Account Title", placeholder: "Account holder name" },
      { id: "bankAccount", type: "text", label: "Account Number / IBAN", placeholder: "PK00XXXX0000000000000000" },
    ],
  },
  { id: "otp-password", title: "Verify & Set Password", component: OtpPasswordStep,
    validate: (d) =>
      !d.otp ? "Please enter the OTP sent to your phone" :
      !d.password ? "Password is required" :
      d.password !== d.confirmPassword ? "Passwords do not match" :
      !d.terms ? "Please accept the Terms & Conditions" : null },
];

/* ─── FileField helper ─────────────────────────────────────────────── */
function FileField({ label, fieldId, value, onChange }: {
  label: string; fieldId: string; value: File | null; onChange: (f: File | null) => void;
}) {
  const t = useAuthTheme();
  const ref = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: t.primary, textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</label>
      <div onClick={() => ref.current?.click()}
        style={{ height: 80, border: `1.5px dashed ${value ? t.primary : t.border}`, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", background: value ? t.primaryLight : t.background, overflow: "hidden" }}>
        {preview ? <img src={preview} alt={label} style={{ height: "100%", width: "100%", objectFit: "cover" }} />
          : <span style={{ color: t.textMuted, fontSize: 12 }}>📷 Tap to upload {label}</span>}
      </div>
      <input ref={ref} type="file" accept="image/*" capture="environment" style={{ display: "none" }} id={fieldId}
        onChange={(e) => { const f = e.target.files?.[0] ?? null; onChange(f); setPreview(f ? URL.createObjectURL(f) : null); }} />
    </div>
  );
}

/* ─── DocumentsStep ────────────────────────────────────────────────── */
function DocumentsStep({ data, onChange, onError }: StepComponentProps) {
  const t = useAuthTheme();
  const inp: React.CSSProperties = { width: "100%", height: 48, padding: "0 14px", borderRadius: 12, background: t.background, border: `1.5px solid ${t.border}`, color: t.text, fontSize: 14, outline: "none", boxSizing: "border-box" };
  const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: t.primary, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 6 };
  const fmtCnic = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 13);
    if (d.length <= 5) return d;
    if (d.length <= 12) return `${d.slice(0, 5)}-${d.slice(5)}`;
    return `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}`;
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <p style={{ color: t.textMuted, fontSize: 13, margin: "0 0 4px" }}>Phone for OTP verification and KYC documents</p>
      <div>
        <label style={lbl}>Phone Number *</label>
        <input type="tel" inputMode="tel" placeholder="03XXXXXXXXX" maxLength={11} style={inp}
          value={(data.phone as string) ?? ""} onChange={(e) => { onChange("phone", e.target.value.replace(/\D/g, "").slice(0, 11)); onError(""); }} />
        {!!data.phone && !isValidPhone(String(data.phone)) && <p style={{ color: t.error, fontSize: 11, margin: "4px 0 0" }}>✗ Valid Pakistani number required (03XXXXXXXXX)</p>}
        {!!data.phone && isValidPhone(String(data.phone)) && <p style={{ color: t.primary, fontSize: 11, margin: "4px 0 0" }}>✓ Valid number</p>}
      </div>
      <div>
        <label style={lbl}>CNIC Number</label>
        <input type="text" inputMode="numeric" placeholder="XXXXX-XXXXXXX-X (optional)" maxLength={15} style={inp}
          value={(data.cnic as string) ?? ""} onChange={(e) => { onChange("cnic", fmtCnic(e.target.value)); onError(""); }} />
        {!!data.cnic && isValidCnic(String(data.cnic)) && <p style={{ color: t.primary, fontSize: 11, margin: "4px 0 0" }}>✓ Valid CNIC</p>}
      </div>
      <FileField label="CNIC Front" fieldId="cnicFrontPhoto" value={(data.cnicFrontPhoto as File) ?? null} onChange={(f) => onChange("cnicFrontPhoto", f)} />
      <FileField label="CNIC Back" fieldId="cnicBackPhoto" value={(data.cnicBackPhoto as File) ?? null} onChange={(f) => onChange("cnicBackPhoto", f)} />
      <FileField label="Store Front Photo" fieldId="storeFrontPhoto" value={(data.storeFrontPhoto as File) ?? null} onChange={(f) => onChange("storeFrontPhoto", f)} />
    </div>
  );
}

/* ─── OtpPasswordStep — pure form UI, no auth logic ──────────────── */
function OtpPasswordStep({ data, onChange, onError }: StepComponentProps) {
  const t = useAuthTheme();
  const inp: React.CSSProperties = { width: "100%", height: 48, padding: "0 14px", borderRadius: 12, background: t.background, border: `1.5px solid ${t.border}`, color: t.text, fontSize: 14, outline: "none", boxSizing: "border-box" };
  const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: t.primary, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 6 };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p style={{ color: t.primary, fontSize: 13, margin: "0 0 4px" }}>✓ OTP sent to {(data.phone as string) ?? "your phone"}. Enter the code below.</p>
      <div>
        <label style={lbl}>OTP Code *</label>
        <input type="text" inputMode="numeric" maxLength={6} placeholder="______"
          style={{ ...inp, letterSpacing: "0.3em", textAlign: "center", fontSize: 20 }}
          value={(data.otp as string) ?? ""} onChange={(e) => { onChange("otp", e.target.value.replace(/\D/g, "").slice(0, 6)); onError(""); }} />
      </div>
      <div>
        <label style={lbl}>Password *</label>
        <input type="password" autoComplete="new-password" placeholder="Min 8 characters" style={inp}
          value={(data.password as string) ?? ""} onChange={(e) => { onChange("password", e.target.value); onError(""); }} />
      </div>
      <div>
        <label style={lbl}>Confirm Password *</label>
        <input type="password" autoComplete="new-password" placeholder="Repeat password" style={inp}
          value={(data.confirmPassword as string) ?? ""} onChange={(e) => { onChange("confirmPassword", e.target.value); onError(""); }} />
        {!!data.password && !!data.confirmPassword && data.password !== data.confirmPassword &&
          <p style={{ color: t.error, fontSize: 11, margin: "4px 0 0" }}>✗ Passwords do not match</p>}
      </div>
      <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
        <input type="checkbox" checked={!!data.terms} onChange={(e) => onChange("terms", e.target.checked)} style={{ marginTop: 2 }} />
        <span style={{ color: t.textMuted, fontSize: 13 }}>I agree to the Terms &amp; Conditions</span>
      </label>
    </div>
  );
}
