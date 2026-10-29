"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import ComponentCard from "@/components/common/ComponentCard";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
export default function InviteAcceptance() {
  const t = useTranslations("admin");
  const router = useRouter();
  const tokens = useRef<{ access_token: string; refresh_token: string } | null>(
    null,
  );
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const access_token = hash.get("access_token"),
        refresh_token = hash.get("refresh_token");
      window.history.replaceState(null, "", window.location.pathname);
      if (access_token && refresh_token) {
        tokens.current = { access_token, refresh_token };
        setReady(true);
      } else setError("activationInvalid");
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (lock.current || !tokens.current) return;
    if (
      password.length < 12 ||
      password.length > 1024 ||
      !/[A-Za-z]/.test(password) ||
      !/[0-9]/.test(password) ||
      password !== confirmation
    ) {
      setError("passwordMismatch");
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...tokens.current, password }),
      });
      if (!response.ok) throw new Error();
      tokens.current = null;
      setPassword("");
      setConfirmation("");
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("activationError");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <main className="flex min-h-dvh items-center justify-center bg-gray-50 p-4 dark:bg-gray-950">
      <div className="w-full max-w-lg">
        <ComponentCard title={t("activationTitle")} desc={t("activationHint")}>
          <form onSubmit={submit} className="space-y-5">
            <div>
              <Label htmlFor="new-password">{t("password")}</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={password}
                minLength={12}
                maxLength={1024}
                disabled={!ready || busy}
                required
                onChange={(event) => setPassword(event.target.value)}
                hint={t("passwordHint")}
              />
            </div>
            <div>
              <Label htmlFor="confirm-password">{t("confirmPassword")}</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmation}
                disabled={!ready || busy}
                required
                onChange={(event) => setConfirmation(event.target.value)}
              />
            </div>
            {error && (
              <p
                role="alert"
                className="text-sm text-error-600 dark:text-error-400"
              >
                {t(error)}
              </p>
            )}
            <Button type="submit" disabled={!ready || busy}>
              {t(busy ? "activating" : "activate")}
            </Button>
            <Link
              href="/admin"
              className="ms-4 text-sm text-brand-600 dark:text-brand-400"
            >
              {t("login")}
            </Link>
          </form>
        </ComponentCard>
      </div>
    </main>
  );
}
