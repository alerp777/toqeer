/**
 * vendor-register-steps.tsx — vendor-app
 *
 * Step components and config for vendor RegisterWizard.
 * No auth logic — pure form UI and step configuration.
 * OTP sending is delegated to RegisterScreen via onOtpRequest.
 */
import type { StepConfig, StepComponentProps } from "@workspace/auth-react";
import { useAuthTheme } from "@workspace/auth-react";
import { useEffect, useRef, useState } from "react";
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
  } catch { }
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

/* ─── OTP module-level state shared between wizard and step component ─ */
let _otpResender: ((phone: string) => Promise<{ success: boolean; error?: string }>) | null = null;
let _otpWasSent = false;

export function registerOtpResender(
  fn: (phone: string) => Promise<{ success: boolean; error?: string }>
) {
  _otpResender = fn;
}

export function markOtpSent() {
  _otpWasSent = true;
}

export function resetOtpSentState() {
  _otpWasSent = false;
}

/* ─── Shared input/label styles ────────────────────────────────────── */
function useStyles() {
  const t = useAuthTheme();
  return {
    t,
    inp: {
      width: "100%",
      height: 48,
      padding: "0 14px",
      borderRadius: 12,
      background: t.background,
      border: `1.5px solid ${t.border}`,
      color: t.text,
      fontSize: 14,
      outline: "none",
      boxSizing: "border-box",
    } as React.CSSProperties,
    lbl: {
      fontSize: 11,
      fontWeight: 700,
      color: t.primary,
      textTransform: "uppercase",
      letterSpacing: "0.07em",
      display: "block",
      marginBottom: 6,
    } as React.CSSProperties,
  };
}

/* ─── StyledSelect ─────────────────────────────────────────────────── */
function StyledSelect({
  label, value, onChange, options, placeholder, required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  required?: boolean;
}) {
  const { t, inp, lbl } = useStyles();
  return (
    <div style={{ position: "relative" }}>
      <label style={lbl}>{label}{required && " *"}</label>
      <div style={{ position: "relative" }}>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            ...inp,
            paddingRight: 36,
            appearance: "none",
            WebkitAppearance: "none",
            cursor: "pointer",
            color: value ? t.text : t.textMuted,
          }}
        >
          {placeholder && <option value="" disabled style={{ color: t.textMuted }}>{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value} style={{ background: t.surface ?? "#0F1827", color: t.text }}>
              {o.label}
            </option>
          ))}
        </select>
        <span style={{
          position: "absolute",
          right: 14,
          top: "50%",
          transform: "translateY(-50%)",
          pointerEvents: "none",
          color: t.textMuted,
          fontSize: 12,
        }}>▾</span>
      </div>
    </div>
  );
}

/* ─── Step config ──────────────────────────────────────────────────── */
const STORE_CATS = [
  "Grocery", "Restaurant", "Bakery", "Pharmacy", "Electronics", "Clothing",
  "General Store", "Fast Food", "Fruits & Vegetables", "Dairy", "Meat & Poultry", "Other",
];

/* ─── StoreInfoStep (step 1) — uses styled selects ─────────────────── */
function StoreInfoStep({ data, onChange, onError }: StepComponentProps) {
  const { t, inp, lbl } = useStyles();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <label style={lbl}>Store Name *</label>
        <input
          type="text"
          placeholder="Ali's Grocery"
          style={inp}
          value={(data.storeName as string) ?? ""}
          onChange={(e) => { onChange("storeName", e.target.value); onError(""); }}
        />
      </div>
      <StyledSelect
        label="Category"
        required
        value={(data.storeCategory as string) ?? ""}
        onChange={(v) => { onChange("storeCategory", v); onError(""); }}
        options={STORE_CATS.map((c) => ({ value: c, label: c }))}
        placeholder="Select a category"
      />
      <div>
        <label style={lbl}>Owner Name *</label>
        <input
          type="text"
          placeholder="Full name"
          style={inp}
          value={(data.ownerName as string) ?? ""}
          onChange={(e) => { onChange("ownerName", e.target.value); onError(""); }}
        />
      </div>
      <StyledSelect
        label="City"
        required
        value={(data.city as string) ?? ""}
        onChange={(v) => { onChange("city", v); onError(""); }}
        options={[...PAKISTAN_CITIES].map((c) => ({ value: c, label: c }))}
        placeholder="Select your city"
      />
      <div>
        <label style={lbl}>Address</label>
        <input
          type="text"
          placeholder="Street address"
          style={inp}
          value={(data.address as string) ?? ""}
          onChange={(e) => { onChange("address", e.target.value); onError(""); }}
        />
      </div>
    </div>
  );
}

/* ─── BankDetailsStep (step 3) — optional with "Skip for now" ──────── */
function BankDetailsStep({ data, onChange, onNext }: StepComponentProps) {
  const { t, inp, lbl } = useStyles();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <p style={{ color: t.textMuted, fontSize: 13, margin: "0 0 4px" }}>
        Add bank details to receive payments directly. You can also add these later from your dashboard.
      </p>
      <div>
        <label style={lbl}>Bank Name</label>
        <input
          type="text"
          placeholder="e.g. HBL"
          style={inp}
          value={(data.bankName as string) ?? ""}
          onChange={(e) => onChange("bankName", e.target.value)}
        />
      </div>
      <div>
        <label style={lbl}>Account Title</label>
        <input
          type="text"
          placeholder="Account holder name"
          style={inp}
          value={(data.bankAccountTitle as string) ?? ""}
          onChange={(e) => onChange("bankAccountTitle", e.target.value)}
        />
      </div>
      <div>
        <label style={lbl}>Account Number / IBAN</label>
        <input
          type="text"
          placeholder="PK00XXXX0000000000000000"
          style={inp}
          value={(data.bankAccount as string) ?? ""}
          onChange={(e) => onChange("bankAccount", e.target.value)}
        />
      </div>
      <button
        type="button"
        onClick={onNext}
        style={{
          background: "none",
          border: `1.5px solid ${t.border}`,
          borderRadius: 12,
          color: t.textMuted,
          fontSize: 14,
          fontWeight: 600,
          padding: "11px 0",
          cursor: "pointer",
          width: "100%",
          marginTop: 4,
        }}
      >
        Skip for now →
      </button>
    </div>
  );
}

export const vendorSteps: StepConfig[] = [
  {
    id: "store-info",
    title: "Store Information",
    subtitle: "Tell us about your business",
    component: StoreInfoStep,
    validate: (d) =>
      !d.storeName ? "Store name is required" :
      !d.storeCategory ? "Category is required" :
      !d.ownerName ? "Owner name is required" :
      !d.city ? "City is required" : null,
  },
  {
    id: "documents",
    title: "Contact & Documents",
    component: DocumentsStep,
    validate: (d) => !d.phone ? "Phone number is required" : null,
  },
  {
    id: "bank",
    title: "Bank Details",
    subtitle: "For receiving payments (optional)",
    component: BankDetailsStep,
  },
  {
    id: "otp-password",
    title: "Verify & Set Password",
    component: OtpPasswordStep,
    validate: (d) =>
      !d.otp ? "Please enter the OTP sent to your phone" :
      !d.password ? "Password is required" :
      d.password !== d.confirmPassword ? "Passwords do not match" :
      !d.terms ? "Please accept the Terms & Conditions" : null,
  },
];

/* ─── FileField helper ─────────────────────────────────────────────── */
function FileField({ label, fieldId, value, onChange }: {
  label: string; fieldId: string; value: File | null; onChange: (f: File | null) => void;
}) {
  const { t } = useStyles();
  const ref = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{
        fontSize: 11, fontWeight: 700, color: t.primary,
        textTransform: "uppercase", letterSpacing: "0.07em",
      }}>{label}</label>
      <div
        onClick={() => ref.current?.click()}
        style={{
          height: 80,
          border: `1.5px dashed ${value ? t.primary : t.border}`,
          borderRadius: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          background: value ? t.primaryLight : t.background,
          overflow: "hidden",
        }}
      >
        {preview
          ? <img src={preview} alt={label} style={{ height: "100%", width: "100%", objectFit: "cover" }} />
          : <span style={{ color: t.textMuted, fontSize: 12 }}>📷 Tap to upload {label}</span>}
      </div>
      <p style={{ fontSize: 11, color: t.textMuted, margin: "2px 0 0" }}>
        JPG or PNG · max 5 MB
      </p>
      <input
        ref={ref}
        type="file"
        accept="image/jpeg,image/png"
        capture="environment"
        style={{ display: "none" }}
        id={fieldId}
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          onChange(f);
          setPreview(f ? URL.createObjectURL(f) : null);
        }}
      />
    </div>
  );
}

/* ─── DocumentsStep ────────────────────────────────────────────────── */
function DocumentsStep({ data, onChange, onError }: StepComponentProps) {
  const { t, inp, lbl } = useStyles();
  const fmtCnic = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 13);
    if (d.length <= 5) return d;
    if (d.length <= 12) return `${d.slice(0, 5)}-${d.slice(5)}`;
    return `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}`;
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <p style={{ color: t.textMuted, fontSize: 13, margin: "0 0 4px" }}>
        Phone for OTP verification and KYC documents
      </p>
      <div>
        <label style={lbl}>Phone Number *</label>
        <input
          type="tel"
          inputMode="tel"
          placeholder="03XXXXXXXXX"
          maxLength={11}
          style={inp}
          value={(data.phone as string) ?? ""}
          onChange={(e) => { onChange("phone", e.target.value.replace(/\D/g, "").slice(0, 11)); onError(""); }}
        />
        {!!data.phone && !isValidPhone(String(data.phone)) &&
          <p style={{ color: t.error, fontSize: 11, margin: "4px 0 0" }}>✗ Valid Pakistani number required (03XXXXXXXXX)</p>}
        {!!data.phone && isValidPhone(String(data.phone)) &&
          <p style={{ color: t.primary, fontSize: 11, margin: "4px 0 0" }}>✓ Valid number</p>}
      </div>
      <div>
        <label style={lbl}>CNIC Number</label>
        <input
          type="text"
          inputMode="numeric"
          placeholder="XXXXX-XXXXXXX-X (optional)"
          maxLength={15}
          style={inp}
          value={(data.cnic as string) ?? ""}
          onChange={(e) => { onChange("cnic", fmtCnic(e.target.value)); onError(""); }}
        />
        {!!data.cnic && isValidCnic(String(data.cnic)) &&
          <p style={{ color: t.primary, fontSize: 11, margin: "4px 0 0" }}>✓ Valid CNIC</p>}
      </div>
      <FileField label="CNIC Front" fieldId="cnicFrontPhoto" value={(data.cnicFrontPhoto as File) ?? null} onChange={(f) => onChange("cnicFrontPhoto", f)} />
      <FileField label="CNIC Back" fieldId="cnicBackPhoto" value={(data.cnicBackPhoto as File) ?? null} onChange={(f) => onChange("cnicBackPhoto", f)} />
      <FileField label="Store Front Photo" fieldId="storeFrontPhoto" value={(data.storeFrontPhoto as File) ?? null} onChange={(f) => onChange("storeFrontPhoto", f)} />
    </div>
  );
}

/* ─── Password strength helper ─────────────────────────────────────── */
function getPasswordStrength(pw: string): { level: 0 | 1 | 2 | 3; label: string } {
  if (!pw) return { level: 0, label: "" };
  const hasUpper = /[A-Z]/.test(pw);
  const hasLower = /[a-z]/.test(pw);
  const hasNumber = /[0-9]/.test(pw);
  const hasSymbol = /[^A-Za-z0-9]/.test(pw);
  if (pw.length >= 10 && (hasUpper || hasLower) && hasNumber && hasSymbol) return { level: 3, label: "Strong" };
  if (pw.length >= 8 && ((hasUpper && hasLower) || hasNumber)) return { level: 2, label: "Fair" };
  return { level: 1, label: "Weak" };
}

function PasswordStrengthBar({ password }: { password: string }) {
  const { t } = useStyles();
  const { level, label } = getPasswordStrength(password);
  if (!password) return null;
  const colors = [t.error ?? "#EF4444", t.warning ?? "#F59E0B", t.success ?? "#22C55E"];
  const activeColor = colors[level - 1] ?? colors[0];
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
        {[1, 2, 3].map((bar) => (
          <div
            key={bar}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              background: bar <= level ? activeColor : t.border,
              transition: "background 0.2s",
            }}
          />
        ))}
      </div>
      <p style={{ fontSize: 11, color: activeColor, margin: 0, fontWeight: 600 }}>{label}</p>
    </div>
  );
}

/* ─── OtpPasswordStep — pure form UI, no auth logic ──────────────── */
function OtpPasswordStep({ data, onChange, onError }: StepComponentProps) {
  const { t, inp, lbl } = useStyles();
  const [countdown, setCountdown] = useState(0);
  const [resending, setResending] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCountdown = () => {
    setCountdown(60);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(timerRef.current!); return 0; }
        return c - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    if (_otpWasSent) {
      onChange("otpSent", true);
      startCountdown();
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const handleResend = async () => {
    if (!_otpResender || countdown > 0 || resending) return;
    setResending(true);
    try {
      const phone = (data.phone as string) ?? "";
      const result = await _otpResender(phone);
      if (result.success) {
        onChange("otpSent", true);
        startCountdown();
      }
    } finally {
      setResending(false);
    }
  };

  const password = (data.password as string) ?? "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {!!data.otpSent && (
        <p style={{ color: t.primary, fontSize: 13, margin: "0 0 4px" }}>
          ✓ OTP sent to {(data.phone as string) ?? "your phone"}. Enter the code below.
        </p>
      )}
      <div>
        <label style={lbl}>OTP Code *</label>
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder="______"
          style={{ ...inp, letterSpacing: "0.3em", textAlign: "center", fontSize: 20 }}
          value={(data.otp as string) ?? ""}
          onChange={(e) => { onChange("otp", e.target.value.replace(/\D/g, "").slice(0, 6)); onError(""); }}
        />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", marginTop: 6 }}>
          <button
            type="button"
            onClick={handleResend}
            disabled={countdown > 0 || resending}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              fontSize: 12,
              fontWeight: 600,
              cursor: countdown > 0 || resending ? "not-allowed" : "pointer",
              color: countdown > 0 || resending ? t.textMuted : t.primary,
            }}
          >
            {resending ? "Sending…" : countdown > 0 ? `Resend OTP in ${countdown}s` : "Resend OTP"}
          </button>
        </div>
      </div>
      <div>
        <label style={lbl}>Password *</label>
        <input
          type="password"
          autoComplete="new-password"
          placeholder="Min 8 characters"
          style={inp}
          value={password}
          onChange={(e) => { onChange("password", e.target.value); onError(""); }}
        />
        <PasswordStrengthBar password={password} />
      </div>
      <div>
        <label style={lbl}>Confirm Password *</label>
        <input
          type="password"
          autoComplete="new-password"
          placeholder="Repeat password"
          style={inp}
          value={(data.confirmPassword as string) ?? ""}
          onChange={(e) => { onChange("confirmPassword", e.target.value); onError(""); }}
        />
        {!!data.password && !!data.confirmPassword && data.password !== data.confirmPassword &&
          <p style={{ color: t.error, fontSize: 11, margin: "4px 0 0" }}>✗ Passwords do not match</p>}
      </div>
      <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={!!data.terms}
          onChange={(e) => onChange("terms", e.target.checked)}
          style={{ marginTop: 2 }}
        />
        <span style={{ color: t.textMuted, fontSize: 13 }}>
          I agree to the{" "}
          <a
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: t.primary, textDecoration: "underline" }}
            onClick={(e) => e.stopPropagation()}
          >
            Terms &amp; Conditions
          </a>
        </span>
      </label>
    </div>
  );
}
