"use client";
import { useRef, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import CrewDialog from "@/components/crew/CrewDialog";
import Button from "@/components/ui/button/Button";
import { validPassword } from "@/lib/auth/password";
import PasswordField from "./PasswordField";

interface PasswordDialogProps {
  target?: { id: string; name: string };
  onClose: () => void;
  onChanged?: () => void;
}
const errorCodes: Record<string, string> = {
  PASSWORD_CURRENT_INVALID: "currentInvalid",
  PASSWORD_WEAK: "weak",
  PASSWORD_INVALID: "invalid",
  PASSWORD_SAME: "same",
  PASSWORD_REAUTH: "reauth",
  PASSWORD_USER_MISSING: "missing",
  PASSWORD_FORBIDDEN: "forbidden",
  PASSWORD_RATE_LIMIT: "rateLimit",
};
export default function PasswordDialog({
  target,
  onClose,
  onChanged,
}: PasswordDialogProps) {
  const t = useTranslations("passwords");
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (lock.current) return;
    if (!current || !validPassword(password)) {
      setError("invalid");
      return;
    }
    if (password !== confirmation) {
      setError("mismatch");
      return;
    }
    if (password === current) {
      setError("same");
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        "/api/organizer/functions/v1/organizer-api",
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: target ? "reset-password" : "change-password",
            current_password: current,
            password,
            ...(target ? { user_id: target.id } : {}),
          }),
        },
      );
      const result = await response.json().catch(() => null);
      if (!response.ok || result?.ok !== true) {
        setError(
          response.status === 401
            ? "session"
            : response.status === 403
              ? "forbidden"
              : response.status === 429
                ? "rateLimit"
                : errorCodes[result?.code] || "failed",
        );
        return;
      }
      setCurrent("");
      setPassword("");
      setConfirmation("");
      setSaved(true);
      if (!target) onChanged?.();
    } catch {
      setError("failed");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <CrewDialog
      size="form"
      title={t(target ? "resetTitle" : "changeTitle")}
      onClose={onClose}
      busy={busy}
    >
      {saved ? (
        <div className="space-y-5">
          <p
            role="status"
            className="text-sm text-success-700 dark:text-success-400"
          >
            {t(target ? "resetSuccess" : "changeSuccess")}
          </p>
          <Button type="button" onClick={onClose}>
            {t("close")}
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-6">
          <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">
            {target ? t("resetHint", { name: target.name }) : t("changeHint")}
          </p>
          <fieldset
            disabled={busy}
            className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-2"
          >
            <div className="lg:col-span-2">
              <PasswordField
                label={t(target ? "adminPassword" : "currentPassword")}
                current
                value={current}
                onChange={setCurrent}
                disabled={busy}
              />
            </div>
            <PasswordField
              label={t("newPassword")}
              value={password}
              onChange={setPassword}
              disabled={busy}
            />
            <PasswordField
              label={t("confirmPassword")}
              value={confirmation}
              onChange={setConfirmation}
              disabled={busy}
            />
          </fieldset>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t("policy")}
          </p>
          {error && (
            <p
              role="alert"
              className="text-sm text-error-600 dark:text-error-400"
            >
              {t(`errors.${error}`)}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={busy}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={busy}>
              {t(busy ? "saving" : "save")}
            </Button>
          </div>
        </form>
      )}
    </CrewDialog>
  );
}
