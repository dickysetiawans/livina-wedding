"use client";

import { useRef, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import ComponentCard from "@/components/common/ComponentCard";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { EyeIcon, EyeCloseIcon } from "@/icons";
import { configured, CrewApiError, login } from "@/lib/crew/client";
import type { SessionContext } from "@/lib/crew/types";

interface CrewSignInProps {
  onSignedIn: (context: SessionContext) => void;
}
export default function CrewSignIn({ onSignedIn }: CrewSignInProps) {
  const t = useTranslations("crew");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const submitting = useRef(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const form = new FormData(event.currentTarget);
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      onSignedIn(
        await login(String(form.get("email")), String(form.get("password"))),
      );
    } catch (error) {
      setError(error instanceof CrewApiError ? error.code : "network");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="max-w-xl">
      <ComponentCard title={t("signInTitle")} desc={t("signInHint")}>
        <form onSubmit={submit} className="space-y-5">
          <div>
            <Label htmlFor="crew-email">{t("email")}</Label>
            <Input
              id="crew-email"
              name="email"
              type="email"
              autoComplete="username"
              required
              maxLength={254}
              disabled={busy}
            />
          </div>
          <div>
            <Label htmlFor="crew-password">{t("password")}</Label>
            <div className="relative">
              <Input
                id="crew-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                maxLength={1024}
                disabled={busy}
                className="pe-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                disabled={busy}
                aria-label={t(showPassword ? "hidePassword" : "showPassword")}
                aria-pressed={showPassword}
                className="absolute inset-y-0 end-0 flex items-center rounded-e-lg px-3 text-gray-500 focus-visible:outline-2 focus-visible:outline-brand-500 disabled:opacity-50 dark:text-gray-400"
              >
                {showPassword ? (
                  <EyeCloseIcon className="size-5" />
                ) : (
                  <EyeIcon className="size-5" />
                )}
              </button>
            </div>
          </div>
          {error && (
            <p
              role="alert"
              className="text-sm text-error-600 dark:text-error-400"
            >
              {t(`errors.${error}`)}
            </p>
          )}
          <Button
            type="submit"
            disabled={busy || !configured}
            className="w-full"
          >
            {t(busy ? "signingIn" : "signIn")}
          </Button>
        </form>
      </ComponentCard>
    </div>
  );
}
