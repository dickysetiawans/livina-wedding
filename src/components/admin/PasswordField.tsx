"use client";
import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { EyeIcon, EyeCloseIcon } from "@/icons";

interface PasswordFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  current?: boolean;
  disabled: boolean;
}
export default function PasswordField({
  label,
  value,
  onChange,
  current = false,
  disabled,
}: PasswordFieldProps) {
  const t = useTranslations("crew");
  const id = useId();
  const [shown, setShown] = useState(false);
  return (
    <div className="min-w-0 space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={shown ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required
          minLength={current ? 1 : 12}
          maxLength={1024}
          autoComplete={current ? "current-password" : "new-password"}
          disabled={disabled}
          className="pe-12"
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => setShown((v) => !v)}
          aria-label={t(shown ? "hidePassword" : "showPassword")}
          aria-pressed={shown}
          className="absolute inset-y-0 end-0 flex items-center rounded-e-lg px-3 text-gray-500 focus-visible:outline-2 focus-visible:outline-brand-500 disabled:opacity-50 dark:text-gray-400"
        >
          {shown ? (
            <EyeCloseIcon className="size-5" />
          ) : (
            <EyeIcon className="size-5" />
          )}
        </button>
      </div>
    </div>
  );
}
