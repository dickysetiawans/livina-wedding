"use client";
import { useTranslations } from "next-intl";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import type { WhatsAppContact } from "@/lib/wedding/whatsapp";
const selectClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 focus-visible:outline-brand-500 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100";
export default function WhatsAppContactsEditor({
  value,
  disabled,
  onChange,
}: {
  value: WhatsAppContact[];
  disabled: boolean;
  onChange: (rows: WhatsAppContact[]) => void;
}) {
  const t = useTranslations("websiteSettings");
  function change(id: string, patch: Partial<WhatsAppContact>) {
    onChange(value.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {t("contactsHint")}
      </p>
      {value.map((row, index) => (
        <fieldset
          key={row.id}
          disabled={disabled}
          className="grid gap-4 rounded-xl border border-gray-200 p-4 sm:grid-cols-2 dark:border-gray-700"
        >
          <legend className="px-2 text-sm text-gray-700 dark:text-gray-200">
            {t("contactNumber", { number: index + 1 })}
          </legend>
          <div>
            <Label htmlFor={`${row.id}-label`}>{t("label")}</Label>
            <Input
              id={`${row.id}-label`}
              value={row.label}
              maxLength={100}
              onChange={(e) => change(row.id, { label: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor={`${row.id}-number`}>{t("number")}</Label>
            <Input
              id={`${row.id}-number`}
              type="tel"
              value={row.number}
              maxLength={16}
              placeholder="+6281234567890"
              onChange={(e) =>
                change(row.id, {
                  number: e.target.value.replace(/[\s()-]/g, ""),
                })
              }
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor={`${row.id}-message`}>{t("message")}</Label>
            <textarea
              id={`${row.id}-message`}
              className={`${selectClass} h-auto py-3`}
              rows={2}
              value={row.message}
              maxLength={1000}
              onChange={(e) => change(row.id, { message: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor={`${row.id}-order`}>{t("order")}</Label>
            <Input
              id={`${row.id}-order`}
              type="number"
              min={0}
              step={1}
              value={Number.isNaN(row.sort_order) ? "" : row.sort_order}
              onChange={(e) =>
                change(row.id, {
                  sort_order:
                    e.target.value === "" ? NaN : Number(e.target.value),
                })
              }
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
              <input
                type="checkbox"
                className="accent-brand-500"
                checked={row.is_active}
                onChange={(e) =>
                  change(row.id, { is_active: e.target.checked })
                }
              />
              {t("active")}
            </label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={disabled}
              onClick={() =>
                onChange(value.filter((item) => item.id !== row.id))
              }
            >
              {t("remove")}
            </Button>
          </div>
        </fieldset>
      ))}
      {!value.length && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("noContacts")}
        </p>
      )}
      <Button
        type="button"
        size="sm"
        disabled={disabled || value.length >= 50}
        onClick={() =>
          onChange([
            ...value,
            {
              id: crypto.randomUUID(),
              label: "",
              number: "",
              message: "",
              sort_order: Math.min(
                2147483647,
                Math.max(
                  -1,
                  ...value.map((row) =>
                    Number.isFinite(row.sort_order) ? row.sort_order : 0,
                  ),
                ) + 1,
              ),
              is_active: true,
            },
          ])
        }
      >
        {t("addContact")}
      </Button>
    </div>
  );
}
