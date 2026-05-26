/**
 * FirstLoginCredentialsDialog — Admin First-Login Experience
 *
 * A polished, step-by-step wizard shown when an admin logs in with
 * default/seeded credentials. Guides them through:
 *   1. Welcome & security notice
 *   2. Set a strong new password
 *   3. Update username (optional)
 *   4. Success confirmation
 *
 * Features:
 *   – Password strength meter with real-time feedback
 *   – Show/hide password toggle on all fields
 *   – Inline validation with clear error messages
 *   – Skip option (popup dismisses for the session)
 *   – Accessible (ARIA labels, focus management, keyboard nav)
 *   – Reduced-motion support
 *   – Fully typed & error-safe
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAdminAuth } from "@/lib/adminAuthContext";
import {
  computeStrength,
  STRENGTH_META,
  type StrengthLevel,
  validateStrength,
} from "@/lib/auth/passwordStrength";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LogOut,
  ShieldCheck,
  SkipForward,
  UserRound,
  AlertTriangle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type WizardStep = "welcome" | "password" | "username" | "success";

/* ── Helper: strength bar colour for a single segment ──────────────── */
function strengthBarColor(level: StrengthLevel, segment: number): string {
  if (level < segment) return "bg-white/10";
  return STRENGTH_META[level].bar;
}

/* ── Sub-component: Strength Meter ─────────────────────────────────── */
function StrengthMeter({ password }: { password: string }) {
  const level = computeStrength(password);
  const meta = STRENGTH_META[level];

  if (!password) return null;

  return (
    <div className="space-y-1.5 pt-1">
      <div className="flex gap-1" aria-hidden="true">
        {([1, 2, 3, 4] as const).map((bar) => (
          <div
            key={bar}
            className={cn(
              "h-1 flex-1 rounded-full transition-all duration-300",
              strengthBarColor(level, bar)
            )}
          />
        ))}
      </div>
      {level > 0 && (
        <p className={cn("text-[11px] font-semibold", meta.text)}>
          Strength: {meta.label}
        </p>
      )}
    </div>
  );
}

/* ── Sub-component: Requirement Checklist ──────────────────────────── */
function RequirementChecklist({ password }: { password: string }) {
  const checks = useMemo(
    () => [
      { label: "At least 8 characters", met: password.length >= 8 },
      { label: "1 uppercase letter (A–Z)", met: /[A-Z]/.test(password) },
      { label: "1 number (0–9)", met: /[0-9]/.test(password) },
    ],
    [password]
  );

  return (
    <ul className="space-y-1 pt-1">
      {checks.map((c) => (
        <li
          key={c.label}
          className={cn(
            "flex items-center gap-1.5 text-[11px] transition-colors duration-200",
            c.met ? "text-emerald-400" : "text-white/30"
          )}
        >
          <CheckCircle2
            className={cn("h-3 w-3 shrink-0 transition-colors", c.met ? "text-emerald-400" : "text-white/20")}
          />
          {c.label}
        </li>
      ))}
    </ul>
  );
}

/* ── Sub-component: Password Field (with show/hide) ───────────────── */
function PasswordField({
  id,
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
  required,
  show,
  onToggleShow,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoComplete: string;
  required?: boolean;
  show: boolean;
  onToggleShow: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-[11px] font-semibold tracking-widest text-white/40 uppercase"
      >
        {label}
      </label>
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className="h-11 rounded-xl border-white/10 bg-white/[0.06] pr-10 text-sm text-white placeholder:text-white/25 focus:border-indigo-400/60 focus:bg-white/[0.08] focus:ring-indigo-400/15 disabled:opacity-50"
        />
        <button
          type="button"
          onClick={onToggleShow}
          disabled={disabled}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-white/30 transition-colors hover:text-white/60 focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/40 disabled:pointer-events-none"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

/* ── Sub-component: Step Header ────────────────────────────────────── */
function StepHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-5 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30">
        <Icon className="h-7 w-7 text-white" />
      </div>
      <h2 className="text-xl font-bold tracking-tight text-white">{title}</h2>
      <p className="mt-1 text-[13px] text-white/50">{subtitle}</p>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   Main Component
   ════════════════════════════════════════════════════════════════════ */
export function FirstLoginCredentialsDialog() {
  const { state, changePassword, updateOwnProfile, dismissDefaultCredentialsPrompt, logout } =
    useAdminAuth();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<WizardStep>("welcome");

  /* Password step state */
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  /* Username step state */
  const [newUsername, setNewUsername] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");

  /* Shared state */
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Refs for focus management */
  const currentPwRef = useRef<HTMLInputElement>(null);
  const usernameRef = useRef<HTMLInputElement>(null);

  /* ── Open dialog when conditions are met ───────────────────────── */
  useEffect(() => {
    const shouldShow =
      !!state.accessToken &&
      state.usingDefaultCredentials &&
      !state.defaultCredentialsDismissed;

    if (shouldShow) {
      setOpen(true);
      setStep("welcome");
      // Reset form state
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setNewUsername("");
      setNewDisplayName("");
      setError(null);
      setShowCurrent(false);
      setShowNew(false);
      setShowConfirm(false);
    } else {
      setOpen(false);
    }
  }, [state.accessToken, state.usingDefaultCredentials, state.defaultCredentialsDismissed]);

  /* ── Auto-focus first field on step change ────────────────────────── */
  useEffect(() => {
    if (step === "password") {
      setTimeout(() => currentPwRef.current?.focus(), 50);
    }
    if (step === "username") {
      setTimeout(() => usernameRef.current?.focus(), 50);
    }
  }, [step]);

  /* ── Close & skip handlers ───────────────────────────────────────── */
  const handleSkip = useCallback(() => {
    dismissDefaultCredentialsPrompt();
    toast({
      title: "Skipped for now",
      description: "You can update your credentials later in Settings.",
    });
  }, [dismissDefaultCredentialsPrompt, toast]);

  const handleSignOut = useCallback(async () => {
    try {
      await logout();
    } catch {
      // logout() clears local state regardless
    }
  }, [logout]);

  /* ── Password step submit ────────────────────────────────────────── */
  const handlePasswordSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      if (newPassword !== confirmPassword) {
        setError("The two passwords do not match. Please re-enter.");
        return;
      }
      const strengthError = validateStrength(newPassword);
      if (strengthError) {
        setError(strengthError);
        return;
      }
      if (newPassword === currentPassword) {
        setError("Your new password must be different from your current password.");
        return;
      }

      setSubmitting(true);
      try {
        await changePassword(currentPassword, newPassword);
        toast({
          title: "Password updated",
          description: "Your new password is now active.",
        });
        setStep("username");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to change password.");
      } finally {
        setSubmitting(false);
      }
    },
    [currentPassword, newPassword, confirmPassword, changePassword, toast]
  );

  /* ── Username step submit ────────────────────────────────────────── */
  const handleUsernameSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      const trimmedUser = newUsername.trim();
      const trimmedName = newDisplayName.trim();

      // If user skipped both fields, just finish
      if (!trimmedUser && !trimmedName) {
        setStep("success");
        return;
      }

      // Validate username format if provided
      if (trimmedUser) {
        if (trimmedUser.length < 3) {
          setError("Username must be at least 3 characters.");
          return;
        }
        if (!/^[a-zA-Z0-9_.-]+$/.test(trimmedUser)) {
          setError("Username can only contain letters, numbers, underscores, dots, and hyphens.");
          return;
        }
      }

      setSubmitting(true);
      try {
        await updateOwnProfile({
          ...(trimmedUser ? { username: trimmedUser } : {}),
          ...(trimmedName ? { name: trimmedName } : {}),
        });
        toast({
          title: "Profile updated",
          description: "Your account details have been saved.",
        });
        setStep("success");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update profile.");
      } finally {
        setSubmitting(false);
      }
    },
    [newUsername, newDisplayName, updateOwnProfile, toast]
  );

  /* ── Computed helpers ────────────────────────────────────────────── */
  const pwStrength = computeStrength(newPassword);
  const pwValid =
    newPassword.length >= 8 &&
    /[A-Z]/.test(newPassword) &&
    /[0-9]/.test(newPassword) &&
    newPassword === confirmPassword &&
    newPassword !== currentPassword;

  const canSubmitPassword =
    !submitting && currentPassword && newPassword && confirmPassword;

  const canSubmitUsername = !submitting;

  /* ══════════════════════════════════════════════════════════════════
     Render: Welcome Step
     ══════════════════════════════════════════════════════════════════ */
  if (step === "welcome") {
    return (
      <Dialog open={open} onOpenChange={(v) => !v && handleSkip()}>
        <DialogContent
          className="max-w-md border-white/[0.07] bg-[#131720] p-0 shadow-2xl"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <div className="p-6">
            <StepHeader
              icon={ShieldCheck}
              title="Secure Your Account"
              subtitle="Your admin account is using default credentials. Let's set up a strong password."
            />

            {/* Security notice */}
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-400/15 bg-amber-400/8 px-4 py-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <p className="text-[12px] leading-snug text-white/60">
                Using default credentials puts your platform at risk. We strongly
                recommend updating them now. You can skip and do this later in Settings.
              </p>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setStep("password")}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-[14px] font-bold text-white shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60"
              >
                <KeyRound className="h-4 w-4" />
                Update Password Now
              </button>

              <button
                type="button"
                onClick={handleSkip}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 py-3 text-[13px] font-medium text-white/50 transition-all duration-200 hover:border-white/20 hover:text-white/70 hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/10"
              >
                <SkipForward className="h-4 w-4" />
                Skip for Now
              </button>

              <button
                type="button"
                onClick={handleSignOut}
                className="flex w-full items-center justify-center gap-1.5 py-2 text-[12px] font-medium text-white/30 transition-colors hover:text-white/50"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out Instead
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  /* ══════════════════════════════════════════════════════════════════
     Render: Password Step
     ══════════════════════════════════════════════════════════════════ */
  if (step === "password") {
    return (
      <Dialog open={open} onOpenChange={(v) => !v && handleSkip()}>
        <DialogContent
          className="max-w-md border-white/[0.07] bg-[#131720] p-0 shadow-2xl"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <div className="p-6">
            <DialogHeader className="border-b border-white/[0.07] px-0 pt-0 pb-4">
              <DialogTitle className="flex items-center gap-2 text-lg text-white">
                <KeyRound className="h-5 w-5 text-indigo-400" />
                Set New Password
              </DialogTitle>
              <DialogDescription className="text-white/50">
                Create a strong password to replace your default credentials.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handlePasswordSubmit} className="mt-5 space-y-5">
              {/* Current password */}
              <PasswordField
                id="fl-current"
                label="Current password"
                value={currentPassword}
                onChange={setCurrentPassword}
                placeholder="Your current (default) password"
                autoComplete="current-password"
                required
                show={showCurrent}
                onToggleShow={() => setShowCurrent((v) => !v)}
                disabled={submitting}
              />

              {/* New password */}
              <div className="space-y-1.5">
                <PasswordField
                  id="fl-new"
                  label="New password"
                  value={newPassword}
                  onChange={setNewPassword}
                  placeholder="Min 8 chars, 1 uppercase, 1 number"
                  autoComplete="new-password"
                  required
                  show={showNew}
                  onToggleShow={() => setShowNew((v) => !v)}
                  disabled={submitting}
                />
                {newPassword.length > 0 && (
                  <>
                    <StrengthMeter password={newPassword} />
                    <RequirementChecklist password={newPassword} />
                  </>
                )}
              </div>

              {/* Confirm password */}
              <PasswordField
                id="fl-confirm"
                label="Confirm new password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="Re-enter your new password"
                autoComplete="new-password"
                required
                show={showConfirm}
                onToggleShow={() => setShowConfirm((v) => !v)}
                disabled={submitting}
              />

              {/* Error banner */}
              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-500/20 bg-red-500/[0.08] px-3 py-2.5 text-[13px] leading-snug text-red-400 animate-in slide-in-from-top-1 duration-200"
                >
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={!canSubmitPassword}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-[14px] font-bold text-white shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Continue <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              {/* Back / Skip */}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setStep("welcome")}
                  className="text-[12px] font-medium text-white/40 transition-colors hover:text-white/70 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleSkip}
                  className="flex items-center gap-1 text-[12px] font-medium text-white/30 transition-colors hover:text-white/50"
                >
                  <SkipForward className="h-3.5 w-3.5" />
                  Skip
                </button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  /* ══════════════════════════════════════════════════════════════════
     Render: Username Step
     ══════════════════════════════════════════════════════════════════ */
  if (step === "username") {
    return (
      <Dialog open={open} onOpenChange={(v) => !v && handleSkip()}>
        <DialogContent
          className="max-w-md border-white/[0.07] bg-[#131720] p-0 shadow-2xl"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <div className="p-6">
            <DialogHeader className="border-b border-white/[0.07] px-0 pt-0 pb-4">
              <DialogTitle className="flex items-center gap-2 text-lg text-white">
                <UserRound className="h-5 w-5 text-indigo-400" />
                Update Profile
              </DialogTitle>
              <DialogDescription className="text-white/50">
                Optionally change your username or display name. You can leave these blank.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleUsernameSubmit} className="mt-5 space-y-5">
              {/* Current info display */}
              <div className="rounded-lg border border-white/[0.07] bg-white/[0.03] px-4 py-3">
                <p className="text-[11px] font-semibold tracking-widest text-white/30 uppercase">
                  Current
                </p>
                <div className="mt-1 space-y-0.5">
                  <p className="text-[13px] text-white/70">
                    <span className="text-white/40">Username:</span>{" "}
                    {state.user?.username || "—"}
                  </p>
                  <p className="text-[13px] text-white/70">
                    <span className="text-white/40">Name:</span>{" "}
                    {state.user?.name || "—"}
                  </p>
                </div>
              </div>

              {/* New username */}
              <div className="space-y-1.5">
                <label
                  htmlFor="fl-username"
                  className="block text-[11px] font-semibold tracking-widest text-white/40 uppercase"
                >
                  New username <span className="text-white/25 normal-case tracking-normal font-normal">(optional)</span>
                </label>
                <Input
                  id="fl-username"
                  ref={usernameRef as any}
                  type="text"
                  autoComplete="username"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="e.g. admin_mirpur"
                  disabled={submitting}
                  className="h-11 rounded-xl border-white/10 bg-white/[0.06] text-sm text-white placeholder:text-white/25 focus:border-indigo-400/60 focus:bg-white/[0.08] focus:ring-indigo-400/15 disabled:opacity-50"
                />
                <p className="text-[11px] text-white/25">
                  Letters, numbers, underscores, dots, and hyphens only. Min 3 chars.
                </p>
              </div>

              {/* New display name */}
              <div className="space-y-1.5">
                <label
                  htmlFor="fl-displayname"
                  className="block text-[11px] font-semibold tracking-widest text-white/40 uppercase"
                >
                  Display name <span className="text-white/25 normal-case tracking-normal font-normal">(optional)</span>
                </label>
                <Input
                  id="fl-displayname"
                  type="text"
                  autoComplete="name"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  placeholder="e.g. Super Admin"
                  disabled={submitting}
                  className="h-11 rounded-xl border-white/10 bg-white/[0.06] text-sm text-white placeholder:text-white/25 focus:border-indigo-400/60 focus:bg-white/[0.08] focus:ring-indigo-400/15 disabled:opacity-50"
                />
              </div>

              {/* Error banner */}
              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-500/20 bg-red-500/[0.08] px-3 py-2.5 text-[13px] leading-snug text-red-400 animate-in slide-in-from-top-1 duration-200"
                >
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={!canSubmitUsername}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-[14px] font-bold text-white shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Continue <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              {/* Back / Skip */}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setStep("password");
                    setError(null);
                  }}
                  className="text-[12px] font-medium text-white/40 transition-colors hover:text-white/70 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep("success")}
                  className="flex items-center gap-1 text-[12px] font-medium text-white/30 transition-colors hover:text-white/50"
                >
                  <SkipForward className="h-3.5 w-3.5" />
                  Skip this step
                </button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  /* ══════════════════════════════════════════════════════════════════
     Render: Success Step
     ══════════════════════════════════════════════════════════════════ */
  if (step === "success") {
    return (
      <Dialog open={open} onOpenChange={(v) => !v && handleSkip()}>
        <DialogContent
          className="max-w-md border-white/[0.07] bg-[#131720] p-0 shadow-2xl"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <div className="p-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/30">
              <CheckCircle2 className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white">
              You're All Set!
            </h2>
            <p className="mt-2 text-[13px] text-white/50">
              Your credentials have been updated. You can now manage the AJKMart platform securely.
            </p>

            <div className="mt-6 space-y-2">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  dismissDefaultCredentialsPrompt();
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-[14px] font-bold text-white shadow-lg shadow-emerald-500/25 transition-all duration-200 hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
              >
                <ArrowRight className="h-4 w-4" />
                Go to Dashboard
              </button>

              <button
                type="button"
                onClick={handleSignOut}
                className="flex w-full items-center justify-center gap-1.5 py-2 text-[12px] font-medium text-white/30 transition-colors hover:text-white/50"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  /* Fallback — should never reach here */
  return null;
}
