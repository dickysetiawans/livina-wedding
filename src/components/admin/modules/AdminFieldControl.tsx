"use client";
import { useTranslations } from "next-intl";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import CrewPhotoPicker from "@/components/crew/CrewPhotoPicker";
import type { AdminField, AdminRecord, AdminValue } from "@/lib/admin/modules";
import WhatsAppContactsEditor from "./WhatsAppContactsEditor";
import VideoPicker from "./VideoPicker";

export const selectClass =
  "h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 focus-visible:outline-brand-500 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100";
interface AdminFieldControlProps {
  field: AdminField;
  value: AdminValue;
  error?: string;
  editing: boolean;
  disabled: boolean;
  roles: AdminRecord[];
  permissions: string[];
  canPublish: boolean;
  name: string;
  onChange: (value: AdminValue) => void;
  onPosterChange?: (id: string) => void;
  onBusyChange?: (busy: boolean) => void;
}
export default function AdminFieldControl({
  field,
  value,
  error,
  editing,
  disabled,
  roles,
  permissions,
  canPublish,
  name,
  onChange,
  onBusyChange,
  onPosterChange,
}: AdminFieldControlProps) {
  const t = useTranslations("management");
  const id = `admin-field-${field.key}`;
  const hint = t.has(`hints.${field.key}`)
    ? t(`hints.${field.key}`)
    : undefined;
  const locked = disabled || Boolean(editing && field.createOnly);
  let control;
  if (field.type === "contacts")
    control = (
      <WhatsAppContactsEditor
        value={Array.isArray(value) ? value : []}
        disabled={locked}
        onChange={onChange}
      />
    );
  else if (field.type === "checkbox")
    control = (
      <label className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-200">
        <input
          id={id}
          name={field.key}
          type="checkbox"
          checked={value === true}
          disabled={locked}
          onChange={(event) => onChange(event.target.checked)}
          className="mt-1 size-4 accent-brand-500"
        />
        <span>{t(`fields.${field.key}`)}</span>
      </label>
    );
  else if (field.type === "image" || field.type === "video")
    control = permissions.includes("media.read") ? (
      field.type === "image" ? (
        <CrewPhotoPicker
          value={typeof value === "string" ? value : null}
          name={name}
          canUpload={permissions.includes("media.create")}
          disabled={locked}
          onChange={onChange}
          onBusyChange={onBusyChange}
          cropAspect={
            field.key === "logo_media_id"
              ? 1
              : field.key === "hero_poster_id"
                ? 16 / 9
                : 4 / 3
          }
        />
      ) : (
        <VideoPicker
          onPosterChange={onPosterChange}
          value={typeof value === "string" ? value : null}
          disabled={locked}
          canUpload={permissions.includes("media.create")}
          onChange={onChange}
          onBusyChange={onBusyChange}
        />
      )
    ) : (
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {t("noMediaAccess")}
      </p>
    );
  else if (field.type === "textarea")
    control = (
      <textarea
        id={id}
        name={field.key}
        value={String(value || "")}
        maxLength={field.max}
        rows={
          field.key === "full_review" || field.key === "description" ? 5 : 3
        }
        required={field.required}
        disabled={locked}
        aria-invalid={Boolean(error)}
        onChange={(event) => onChange(event.target.value)}
        className={`${selectClass} h-auto py-3`}
      />
    );
  else if (field.type === "role" || field.type === "status")
    control = (
      <select
        id={id}
        name={field.key}
        value={String(value || "")}
        disabled={locked || (field.type === "status" && !canPublish)}
        required={field.required}
        onChange={(event) => onChange(event.target.value)}
        className={selectClass}
        aria-invalid={Boolean(error)}
      >
        {field.type === "role" ? (
          <>
            <option value="">{t("chooseRole")}</option>
            {roles.map((role) => (
              <option
                key={role.id}
                value={role.id}
                disabled={role.is_active !== true}
              >
                {String(role.name)}
                {role.is_active !== true ? ` (${t("inactive")})` : ""}
              </option>
            ))}
          </>
        ) : (
          <>
            <option value="draft">{t("draft")}</option>
            <option value="published">{t("published")}</option>
          </>
        )}
      </select>
    );
  else
    control = (
      <Input
        id={id}
        name={field.key}
        type={
          field.type === "number"
            ? "number"
            : field.type === "email"
              ? "email"
              : "text"
        }
        value={
          typeof value === "number" && Number.isNaN(value)
            ? ""
            : String(value ?? "")
        }
        min={field.type === "number" ? 0 : undefined}
        step={field.type === "number" ? 1 : undefined}
        maxLength={field.max}
        required={field.required}
        disabled={locked}
        error={Boolean(error)}
        onChange={(event) =>
          onChange(
            field.type === "number"
              ? event.target.value === ""
                ? NaN
                : Number(event.target.value)
              : event.target.value,
          )
        }
      />
    );
  return (
    <div className="space-y-2">
      {field.type !== "checkbox" && (
        <Label htmlFor={id}>
          {t(`fields.${field.key}`)}
          {field.required ? " *" : ""}
        </Label>
      )}
      {control}
      {hint && (
        <p className="text-xs leading-5 text-gray-500 dark:text-gray-400">
          {hint}
        </p>
      )}
      {error && (
        <p role="alert" className="text-xs text-error-600 dark:text-error-400">
          {t(`validation.${error}`)}
        </p>
      )}
    </div>
  );
}
