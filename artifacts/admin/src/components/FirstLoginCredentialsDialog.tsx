import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  ShieldCheck,
  User,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAdminAuth } from "@/lib/adminAuthContext";
import {
  computeStrength,
  STRENGTH_META,
  validateStrength,
} from "@/lib/auth/passwordStrength";

/* ─── tiny helpers ──────────────────────────────────────────────────────── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold tracking-[0.12em] text-muted-foreground/60 uppercase">
      {children}
    </p>
  );
}

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-[11px] font-semibold tracking-widest text-muted-foreground/80 uppercase"
    >
      {children}
    </label>
  );
}

function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
  autoComplete,
  disabled,
  show,
  onToggleShow,
  hasError,
  "data-testid": testId,
  inputRef,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoComplete: string;
  disabled: boolean;
  show: boolean;
  onToggleShow: () => void;
  hasError?: boolean;
  "data-testid"?: string;
  inputRef?: React.Ref<HTMLInputElement>;
}) {
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        disabled={disabled}
        data-testid={testId}
        ref={inputRef}
        className={[
          "h-10 rounded-lg pr-10 text-sm transition-all",
          "border-border/70 bg-muted/40",
          hasError
            ? "border-destructive/60 bg-destructive/5 focus:border-destructive/80 focus:ring-destructive/20"
            : "focus:border-indigo-400 focus:ring-indigo-400/20",
        ].join(" ")}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={onToggleShow}
        disabled={disabled}
        aria-label={show ? "Hide password" : "Show password"}
        aria-pressed={show}
        className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-muted-foreground/50 transition-colors hover:text-muted-foreground focus-visible:outline-none disabled:pointer-events-none"
      >
        {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

/* ─── step badge ─────────────────────────────────────────────────────────── */

function StepBadge({
  step,
  label,
  done,
  active,
}: {
  step: number;
  label: string;
  done: boolean;
  active: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={[
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-all",
          done
            ? "bg-emerald-500 text-white"
            : active
              ? "bg-indigo-600 text-white"
              : "bg-muted text-muted-foreground/50",
        ].join(" ")}
      >
        {done ? <CheckCircle2 className="h-3 w-3" /> : step}
      </div>
      <span
        className={[
          "text-[11px] font-semibold",
          done
            ? "text-emerald-600 dark:text-emerald-400"
            : active
              ? "text-foreground"
              : "text-muted-foreground/50",
        ].join(" ")}
      >
        {label}
      </span>
    </div>
  );
}

/* ─── main component ─────────────────────────────────────────────────────── */

export function FirstLoginCredentialsDialog() {
  const { state, changePassword, updateOwnProfile, dismissDefaultCredentialsPrompt } =
    useAdminAuth();
  const { toast } = useToast();

  const wantsToShow = useMemo(
    () =>
      !!state.accessToken && !!state.usingDefaultCredentials && !state.defaultCredentialsDismissed,
    [state.accessToken, state.usingDefaultCredentials, state.defaultCredentialsDismissed]
  );

  const [open, setOpen] = useState(wantsToShow);

  useEffect(() => {
    if (wantsToShow) setOpen(true);
  }, [wantsToShow]);
  useEffect(() => {
    if (!state.accessToken) setOpen(false);
  }, [state.accessToken]);

  /* form state */
  const [username, setUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [currentPwError, setCurrentPwError] = useState(false);
  const [passwordSavedThisSession, setPasswordSavedThisSession] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);

  /* refs for focus management */
  const currentPwRef = useRef<HTMLInputElement>(null);
  const usernameRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setUsername(state.user?.username ?? "");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setFormError(null);
      setCurrentPwError(false);
      setPasswordSavedThisSession(false);
    }
  }, [open, state.user?.username]);

  /* FIX #1: clear BOTH field-level and banner errors when user edits the field */
  useEffect(() => {
    if (currentPwError && currentPassword) {
      setCurrentPwError(false);
      setFormError(null);
    }
  }, [currentPassword, currentPwError]);

  /* also clear banner when newPassword or confirmPassword changes (user is fixing things) */
  useEffect(() => {
    if (formError && (newPassword || confirmPassword)) {
      const isPasswordError =
        formError.toLowerCase().includes("password") ||
        formError.toLowerCase().includes("match") ||
        formError.toLowerCase().includes("strength");
      if (isPasswordError) setFormError(null);
    }
  }, [newPassword, confirmPassword, formError]);

  /* FIX #5: auto-focus username field after password save succeeds */
  useEffect(() => {
    if (passwordSavedThisSession) {
      setTimeout(() => usernameRef.current?.focus(), 80);
    }
  }, [passwordSavedThisSession]);

  const handleSkip = () => {
    dismissDefaultCredentialsPrompt();
    setOpen(false);
  };

  const triggerShake = () => {
    setShakeKey((k) => k + 1);
    setTimeout(() => errorRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setCurrentPwError(false);

    const trimmedUsername = username.trim();
    const currentUsername = state.user?.username ?? "";
    const wantsUsernameChange = trimmedUsername.length > 0 && trimmedUsername !== currentUsername;
    const wantsPasswordChange =
      !passwordSavedThisSession && (newPassword.length > 0 || confirmPassword.length > 0);

    if (!wantsUsernameChange && !wantsPasswordChange) {
      setFormError(
        passwordSavedThisSession
          ? "Enter a new username to finish setup, or skip if you want to keep the current one."
          : "Update your password, username, or both — or click Skip for now."
      );
      triggerShake();
      return;
    }

    if (wantsPasswordChange) {
      if (!currentPassword) {
        setCurrentPwError(true);
        setFormError("Enter your current password to confirm the change.");
        triggerShake();
        return;
      }
      if (newPassword !== confirmPassword) {
        setFormError("New password and confirmation do not match.");
        triggerShake();
        return;
      }
      const strengthError = validateStrength(newPassword);
      if (strengthError) {
        setFormError(strengthError);
        triggerShake();
        return;
      }
      if (newPassword === currentPassword) {
        setFormError("New password must be different from your current password.");
        triggerShake();
        return;
      }
    }

    setSubmitting(true);
    try {
      if (wantsPasswordChange) {
        try {
          await changePassword(currentPassword, newPassword);
          setPasswordSavedThisSession(true);
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Failed to update your password.";
          const isWrongPw =
            msg.toLowerCase().includes("incorrect") ||
            msg.toLowerCase().includes("invalid") ||
            msg.toLowerCase().includes("wrong") ||
            msg.toLowerCase().includes("current password");
          if (isWrongPw) setCurrentPwError(true);
          setFormError(msg);
          triggerShake();
          setTimeout(() => currentPwRef.current?.focus(), 50);
          return;
        }
      }
      if (wantsUsernameChange) {
        try {
          await updateOwnProfile({ username: trimmedUsername });
        } catch (err) {
          const baseMsg = err instanceof Error ? err.message : "Failed to update your username.";
          setFormError(
            passwordSavedThisSession
              ? `Password saved. Username update failed: ${baseMsg}`
              : baseMsg
          );
          triggerShake();
          setTimeout(() => usernameRef.current?.focus(), 50);
          return;
        }
      }

      toast({
        title: "Credentials updated",
        description:
          wantsPasswordChange && wantsUsernameChange
            ? "Use your new username and password on next login."
            : wantsPasswordChange
              ? "Use your new password on next login."
              : "Username updated successfully.",
      });
      dismissDefaultCredentialsPrompt();
      setOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const strengthLevel = computeStrength(newPassword);
  const sm = STRENGTH_META[strengthLevel];

  /* derived step state */
  const step1Done = passwordSavedThisSession;
  const step1Active = !passwordSavedThisSession;

  return (
    <Dialog
      open={open}
      onOpenChange={() => {
        /* intentionally block background-click close; use Skip button */
      }}
    >
      <DialogContent
        className="overflow-hidden rounded-2xl border border-border/60 p-0 shadow-2xl sm:max-w-lg [&_[data-dialog-close]]:hidden"
        data-testid="dialog-first-login-credentials"
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 px-6 pt-6 pb-5">
          {/* grid texture */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg,transparent,transparent 23px,rgba(255,255,255,.6) 23px,rgba(255,255,255,.6) 24px),repeating-linear-gradient(90deg,transparent,transparent 23px,rgba(255,255,255,.6) 23px,rgba(255,255,255,.6) 24px)",
            }}
          />
          {/* glow */}
          <div className="pointer-events-none absolute -top-10 left-1/3 h-32 w-48 -translate-x-1/2 rounded-full bg-indigo-500/20 blur-3xl" />

          <div className="relative flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 shadow ring-1 ring-white/20 backdrop-blur-sm">
                <KeyRound className="h-5 w-5 text-indigo-300" />
              </div>
              <div>
                <DialogTitle className="text-[15px] font-bold leading-tight tracking-tight text-white">
                  Secure your admin account
                </DialogTitle>
                <DialogDescription className="mt-1 text-[12px] leading-snug text-white/55">
                  You are using default credentials. Set a unique password and username.
                </DialogDescription>
                <span className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-amber-300/90 uppercase ring-1 ring-amber-400/20">
                  <ShieldCheck className="h-2.5 w-2.5" />
                  Recommended action
                </span>
              </div>
            </div>

            {/* Skip for now — FIX #6: never disabled so user is never trapped */}
            <button
              type="button"
              onClick={handleSkip}
              title="Skip for now — you can update credentials later in Settings"
              className="group mt-0.5 flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-white/35 transition-all hover:bg-white/10 hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
              data-testid="button-skip-credentials"
            >
              <X className="h-3.5 w-3.5" />
              Skip
            </button>
          </div>

          {/* Step progress */}
          <div className="relative mt-5 flex items-center gap-4">
            <StepBadge step={1} label="Set Password" done={step1Done} active={step1Active} />
            <div className="h-px flex-1 bg-white/10" />
            <StepBadge step={2} label="Set Username" done={false} active={step1Done} />
          </div>
        </div>

        {/* ── Body ────────────────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="space-y-5 px-6 pt-5 pb-2">

            {/* ── Section 1: Password ─────────────────────────────────────── */}
            {passwordSavedThisSession ? (
              /* Password saved banner */
              <div
                className="flex items-center gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/8 px-4 py-3"
                data-testid="text-password-saved"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-emerald-700 dark:text-emerald-300">
                    Password updated
                  </p>
                  <p className="text-[11px] text-emerald-600/70 dark:text-emerald-400/70">
                    Now set a new username below, or save to keep the current one.
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-600/10">
                    <Lock className="h-3 w-3 text-indigo-500" />
                  </div>
                  <SectionLabel>Step 1 — Change password</SectionLabel>
                </div>

                {/* Current password */}
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="flcd-current">Current password</FieldLabel>
                  <PasswordInput
                    id="flcd-current"
                    value={currentPassword}
                    onChange={setCurrentPassword}
                    placeholder="Your current / default password"
                    autoComplete="current-password"
                    disabled={submitting}
                    show={showCurrent}
                    onToggleShow={() => setShowCurrent((v) => !v)}
                    hasError={currentPwError}
                    inputRef={currentPwRef}
                    data-testid="input-current-password"
                  />
                  {currentPwError && (
                    <p className="text-[11px] text-destructive">
                      Incorrect current password — try again.
                    </p>
                  )}
                </div>

                {/* New password */}
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="flcd-new">New password</FieldLabel>
                  <PasswordInput
                    id="flcd-new"
                    value={newPassword}
                    onChange={setNewPassword}
                    placeholder="Min 8 chars, 1 uppercase, 1 number"
                    autoComplete="new-password"
                    disabled={submitting}
                    show={showNew}
                    onToggleShow={() => setShowNew((v) => !v)}
                    data-testid="input-new-password"
                  />

                  {/* strength meter */}
                  {newPassword.length > 0 && (
                    <div className="space-y-1 pt-0.5">
                      <div className="flex gap-1">
                        {([1, 2, 3, 4] as const).map((bar) => (
                          <div
                            key={bar}
                            className={`h-[3px] flex-1 rounded-full transition-all duration-300 ${
                              strengthLevel >= bar ? sm.bar : "bg-border/50"
                            }`}
                          />
                        ))}
                      </div>
                      {strengthLevel > 0 && (
                        <p className={`text-[11px] font-semibold ${sm.text}`}>{sm.label}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Confirm password */}
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="flcd-confirm">Confirm new password</FieldLabel>
                  <div className="relative">
                    <Input
                      id="flcd-confirm"
                      type={showNew ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      autoComplete="new-password"
                      disabled={submitting}
                      data-testid="input-confirm-password"
                      className={[
                        "h-10 rounded-lg pr-10 text-sm transition-all border-border/70 bg-muted/40",
                        confirmPassword.length > 0 && confirmPassword !== newPassword
                          ? "border-destructive/60 bg-destructive/5 focus:border-destructive/80 focus:ring-destructive/20"
                          : confirmPassword.length > 0 && confirmPassword === newPassword
                            ? "border-emerald-500/50 focus:border-emerald-400 focus:ring-emerald-400/20"
                            : "focus:border-indigo-400 focus:ring-indigo-400/20",
                      ].join(" ")}
                    />
                    {confirmPassword.length > 0 && (
                      <div className="absolute inset-y-0 right-3 flex items-center">
                        {confirmPassword === newPassword ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <AlertCircle className="h-3.5 w-3.5 text-destructive/70" />
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-[11px] text-muted-foreground/50">
                  Leave all password fields empty to skip password change and only update the username below.
                </p>
              </div>
            )}

            {/* ── Section 2: Username ─────────────────────────────────────── */}
            {/* FIX #4: removed opacity-60 — always fully readable */}
            <div
              className={`rounded-xl border border-border/50 p-4 space-y-3 transition-colors ${
                !passwordSavedThisSession ? "bg-muted/10" : "bg-muted/20"
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-600/10">
                  <User className="h-3 w-3 text-indigo-500" />
                </div>
                <SectionLabel>Step 2 — Change username</SectionLabel>
              </div>

              <div className="space-y-1.5">
                <FieldLabel htmlFor="flcd-username">New username</FieldLabel>
                <Input
                  id="flcd-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={state.user?.username ?? "admin"}
                  autoComplete="username"
                  disabled={submitting}
                  ref={usernameRef}
                  className="h-10 rounded-lg border-border/70 bg-muted/40 text-sm transition-all focus:border-indigo-400 focus:ring-indigo-400/20"
                  data-testid="input-new-username"
                />
                <p className="text-[11px] text-muted-foreground/50">
                  Current:{" "}
                  <span className="font-mono font-medium text-muted-foreground">
                    {state.user?.username ?? "—"}
                  </span>
                  . Leave unchanged to keep.
                </p>
              </div>
            </div>

            {/* ── Error banner ────────────────────────────────────────────── */}
            {formError && (
              <div
                key={shakeKey}
                ref={errorRef}
                role="alert"
                data-testid="text-credentials-error"
                className="animate-shake"
              >
                <div className="flex items-start gap-2.5 rounded-xl border border-destructive/25 bg-destructive/8 px-3.5 py-2.5 animate-in slide-in-from-top-1 duration-200">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  <p className="text-[13px] leading-snug text-destructive">{formError}</p>
                </div>
              </div>
            )}
          </div>

          {/* ── Footer ──────────────────────────────────────────────────────── */}
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-border/60 bg-muted/20 px-6 py-4">
            <button
              type="button"
              onClick={handleSkip}
              className="text-[12px] font-medium text-muted-foreground/60 underline-offset-2 transition-colors hover:text-muted-foreground hover:underline focus-visible:outline-none"
              data-testid="button-skip-credentials-footer"
            >
              Skip for now
            </button>

            <Button
              type="submit"
              size="sm"
              disabled={submitting}
              className="h-9 rounded-lg border-0 bg-indigo-600 px-5 text-[13px] font-semibold text-white shadow hover:bg-indigo-500 focus-visible:ring-indigo-400/40 active:bg-indigo-700"
              data-testid="button-save-credentials"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default FirstLoginCredentialsDialog;
