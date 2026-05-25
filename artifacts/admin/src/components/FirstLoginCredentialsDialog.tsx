import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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

  const [username, setUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [passwordSavedThisSession, setPasswordSavedThisSession] = useState(false);

  useEffect(() => {
    if (open) {
      setUsername(state.user?.username ?? "");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setFormError(null);
      setPasswordSavedThisSession(false);
    }
  }, [open, state.user?.username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedUsername = username.trim();
    const currentUsername = state.user?.username ?? "";
    const wantsUsernameChange = trimmedUsername.length > 0 && trimmedUsername !== currentUsername;
    const wantsPasswordChange =
      !passwordSavedThisSession && (newPassword.length > 0 || confirmPassword.length > 0);

    if (!wantsUsernameChange && !wantsPasswordChange) {
      setFormError(
        passwordSavedThisSession
          ? "Pick a new username to finish setup."
          : "Update your username, password, or both to secure your account."
      );
      return;
    }

    if (wantsPasswordChange) {
      if (!currentPassword) {
        setFormError("Enter your current password to confirm the change.");
        return;
      }
      if (newPassword !== confirmPassword) {
        setFormError("The new password and confirmation do not match.");
        return;
      }
      const strengthError = validateStrength(newPassword);
      if (strengthError) {
        setFormError(strengthError);
        return;
      }
      if (newPassword === currentPassword) {
        setFormError("The new password must be different from your current password.");
        return;
      }
    }

    setSubmitting(true);
    try {
      if (wantsPasswordChange) {
        try {
          await changePassword(currentPassword, newPassword);
          setPasswordSavedThisSession(true);
          setNewPassword("");
          setConfirmPassword("");
        } catch (err) {
          setFormError(err instanceof Error ? err.message : "Failed to update your password.");
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
              ? `Password was updated, but username change failed: ${baseMsg}`
              : baseMsg
          );
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
              : "Use your new username on next login.",
      });
      dismissDefaultCredentialsPrompt();
      setOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const strengthLevel = computeStrength(newPassword);
  const sm = STRENGTH_META[strengthLevel];

  return (
    <Dialog
      open={open}
      onOpenChange={(_next) => {
        // Block dismissal — credentials must be updated before continuing
      }}
    >
      <DialogContent
        className="overflow-hidden rounded-2xl border-0 p-0 shadow-2xl sm:max-w-md [&_[data-dialog-close]]:hidden"
        data-testid="dialog-first-login-credentials"
      >
        {/* ── Header ───────────────────────────────────────────── */}
        <div className="relative bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-600 px-6 pt-6 pb-5">
          {/* subtle grid texture */}
          <div
            className="pointer-events-none absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg,transparent,transparent 19px,rgba(255,255,255,.4) 19px,rgba(255,255,255,.4) 20px),repeating-linear-gradient(90deg,transparent,transparent 19px,rgba(255,255,255,.4) 19px,rgba(255,255,255,.4) 20px)",
            }}
          />
          <div className="relative flex items-start gap-4 pr-2">
            {/* icon badge */}
            <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 shadow-lg ring-1 ring-white/30 backdrop-blur-sm">
              <KeyRound className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-base leading-tight font-bold tracking-tight text-white">
                Secure your admin account
              </DialogTitle>
              <DialogDescription className="mt-1 text-[13px] leading-snug text-white/80">
                You're using default credentials — set a unique username and password.
              </DialogDescription>
              {/* security badge */}
              <span className="mt-2.5 inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-semibold tracking-wider text-white/90 uppercase backdrop-blur-sm">
                <ShieldCheck className="h-3 w-3" />
                Security setup required
              </span>
            </div>
          </div>
        </div>

        {/* ── Body ─────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="bg-background">
          <div className="space-y-5 px-6 pt-5 pb-1">
            {/* Username */}
            <div className="space-y-1.5">
              <label
                htmlFor="flcd-username"
                className="text-muted-foreground block text-[11px] font-semibold tracking-widest uppercase"
              >
                Username
              </label>
              <Input
                id="flcd-username"
                type="text"
                value={username}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                placeholder={state.user?.username ?? "admin"}
                autoComplete="username"
                disabled={submitting}
                className="border-border/70 bg-muted/40 h-10 rounded-lg text-sm transition-colors focus:border-indigo-400 focus:ring-indigo-400/20"
                data-testid="input-new-username"
              />
              <p className="text-muted-foreground/70 text-[12px]">
                Leave unchanged to keep the current username.
              </p>
            </div>

            {/* Current password (required when changing password) */}
            {!passwordSavedThisSession && (
              <div className="space-y-1.5">
                <label
                  htmlFor="flcd-current"
                  className="text-muted-foreground block text-[11px] font-semibold tracking-widest uppercase"
                >
                  Current password
                </label>
                <div className="relative">
                  <Input
                    id="flcd-current"
                    type={showPasswords ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCurrentPassword(e.target.value)
                    }
                    placeholder="Your current password"
                    autoComplete="current-password"
                    disabled={submitting}
                    className="border-border/70 bg-muted/40 h-10 rounded-lg pr-10 text-sm transition-colors focus:border-indigo-400 focus:ring-indigo-400/20"
                    data-testid="input-current-password"
                  />
                </div>
              </div>
            )}

            {/* Password section */}
            {passwordSavedThisSession ? (
              <div
                className="flex items-center gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/8 px-4 py-3"
                data-testid="text-password-saved"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                    Password updated
                  </p>
                  <p className="text-[12px] text-emerald-600/70 dark:text-emerald-400/70">
                    Now set a new username to finish setup.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* new password */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="flcd-new"
                    className="text-muted-foreground block text-[11px] font-semibold tracking-widest uppercase"
                  >
                    New password
                  </label>
                  <div className="relative">
                    <Input
                      id="flcd-new"
                      type={showPasswords ? "text" : "password"}
                      value={newPassword}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setNewPassword(e.target.value)
                      }
                      placeholder="Min 8 chars, 1 uppercase, 1 number"
                      autoComplete="new-password"
                      disabled={submitting}
                      className="border-border/70 bg-muted/40 h-10 rounded-lg pr-10 text-sm transition-colors focus:border-indigo-400 focus:ring-indigo-400/20"
                      data-testid="input-new-password"
                    />
                    <button
                      type="button"
                      className="text-muted-foreground/60 hover:text-muted-foreground absolute inset-y-0 right-0 flex w-9 items-center justify-center rounded-r-lg transition-colors focus-visible:outline-none"
                      onClick={() => setShowPasswords((v) => !v)}
                      aria-label={showPasswords ? "Hide password" : "Show password"}
                      aria-pressed={showPasswords}
                    >
                      {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  {/* strength meter */}
                  {newPassword.length > 0 && (
                    <div className="space-y-1.5 pt-0.5">
                      <div className="flex gap-1">
                        {([1, 2, 3, 4] as const).map((bar) => (
                          <div
                            key={bar}
                            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                              strengthLevel >= bar ? sm.bar : "bg-border/60"
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

                {/* confirm password */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="flcd-confirm"
                    className="text-muted-foreground block text-[11px] font-semibold tracking-widest uppercase"
                  >
                    Confirm password
                  </label>
                  <Input
                    id="flcd-confirm"
                    type={showPasswords ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setConfirmPassword(e.target.value)
                    }
                    placeholder="Re-enter the new password"
                    autoComplete="new-password"
                    disabled={submitting}
                    className="border-border/70 bg-muted/40 h-10 rounded-lg text-sm transition-colors focus:border-indigo-400 focus:ring-indigo-400/20"
                    data-testid="input-confirm-password"
                  />
                </div>
              </div>
            )}

            {/* Error */}
            {formError && (
              <div
                className="border-destructive/25 bg-destructive/8 flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5"
                data-testid="text-credentials-error"
              >
                <AlertCircle className="text-destructive mt-0.5 h-4 w-4 shrink-0" />
                <p className="text-destructive text-[13px] leading-snug">{formError}</p>
              </div>
            )}
          </div>

          {/* ── Footer ─────────────────────────────────────────── */}
          <div className="border-border/60 bg-muted/20 mt-4 flex items-center justify-end gap-3 border-t px-6 py-4">
            <Button
              type="submit"
              size="sm"
              disabled={submitting}
              className="h-8 rounded-lg border-0 bg-indigo-600 px-4 text-[13px] font-semibold text-white hover:bg-indigo-500 focus-visible:ring-indigo-400/40 active:bg-indigo-700"
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
