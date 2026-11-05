"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Button from "@/components/ui/button/Button";
import {
  masterOptions,
  AdminApiError,
  type MasterOption,
} from "@/lib/admin/client";
interface MasterDataSelectProps {
  table: "events" | "positions";
  id: string;
  name: string;
  value: string;
  disabled?: boolean;
  required?: boolean;
  onChange: (id: string) => void;
}
export default function MasterDataSelect({
  table,
  id,
  name,
  value,
  disabled,
  required,
  onChange,
}: MasterDataSelectProps) {
  const t = useTranslations("management");
  const [result, setResult] = useState<{
    rows: MasterOption[];
    error: string;
    loading: boolean;
  }>({ rows: [], error: "", loading: true });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    void masterOptions(table)
      .then((rows) => {
        if (active) setResult({ rows, error: "", loading: false });
      })
      .catch((error) => {
        if (active)
          setResult({
            rows: [],
            loading: false,
            error: error instanceof AdminApiError ? error.code : "network",
          });
      });
    return () => {
      active = false;
    };
  }, [table, revision]);
  return (
    <div className="space-y-2">
      <select
        id={id}
        name={name}
        value={value}
        required={required}
        disabled={disabled || result.loading || !!result.error}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 focus-visible:outline-brand-500 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
      >
        <option value="">
          {t(
            result.loading
              ? "masterLoading"
              : table === "events"
                ? "chooseEvent"
                : "choosePosition",
          )}
        </option>
        {value && !result.rows.some((row) => row.id === value) && (
          <option value={value} disabled>
            {t("masterUnavailable")}
          </option>
        )}
        {result.rows.map((row) => (
          <option key={row.id} value={row.id}>
            {row.name}
          </option>
        ))}
      </select>
      {!result.loading && !result.error && !result.rows.length && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {t("masterEmpty", { module: t(`modules.${table}`) })}
        </p>
      )}
      {result.error && (
        <div className="space-y-2">
          <p
            role="alert"
            className="text-xs text-error-600 dark:text-error-400"
          >
            {t(`errors.${result.error}`)}
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled}
            onClick={() => {
              setResult((current) => ({
                ...current,
                loading: true,
                error: "",
              }));
              setRevision((current) => current + 1);
            }}
          >
            {t("refresh")}
          </Button>
        </div>
      )}
    </div>
  );
}
