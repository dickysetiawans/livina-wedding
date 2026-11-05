"use client";
import { useTranslations } from "next-intl";
import Button from "@/components/ui/button/Button";
export default function BenefitsEditor({
  value,
  disabled,
  onChange,
}: {
  value: string[];
  disabled: boolean;
  onChange: (rows: string[]) => void;
}) {
  const t = useTranslations("management");
  function move(index: number, offset: number) {
    const rows = [...value];
    [rows[index], rows[index + offset]] = [rows[index + offset], rows[index]];
    onChange(rows);
  }
  return (
    <div className="space-y-3">
      {value.map((row, index) => (
        <div key={index} className="flex flex-wrap items-center gap-2">
          <input
            name="benefits"
            aria-label={t("benefitNumber", { number: index + 1 })}
            value={row}
            maxLength={500}
            disabled={disabled}
            onChange={(event) =>
              onChange(
                value.map((item, n) =>
                  n === index ? event.target.value : item,
                ),
              )
            }
            className="h-11 min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || index === 0}
            onClick={() => move(index, -1)}
          >
            {t("benefitUp")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || index === value.length - 1}
            onClick={() => move(index, 1)}
          >
            {t("benefitDown")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => onChange(value.filter((_, n) => n !== index))}
          >
            {t("delete")}
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || value.length >= 50}
        onClick={() => onChange([...value, ""])}
      >
        {t("addBenefit")}
      </Button>
    </div>
  );
}
