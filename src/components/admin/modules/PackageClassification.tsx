"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { masterOptions, type MasterOption } from "@/lib/admin/client";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
interface Props {
  category: string;
  subcategory: string;
  disabled: boolean;
  onlyParents?: boolean;
  onChange: (category: string, subcategory: string) => void;
  onRequired: (required: boolean) => void;
}
export default function PackageClassification({
  category,
  subcategory,
  disabled,
  onlyParents = false,
  onChange,
  onRequired,
}: Props) {
  const t = useTranslations("management");
  const [data, setData] = useState<{
    categories: MasterOption[];
    children: MasterOption[];
    error: boolean;
    loading: boolean;
  }>({ categories: [], children: [], error: false, loading: true });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let live = true;
    Promise.all([
      masterOptions("package_categories"),
      masterOptions("package_subcategories"),
    ])
      .then(([categories, children]) => {
        if (live)
          setData({ categories, children, error: false, loading: false });
      })
      .catch(() => {
        if (live)
          setData({
            categories: [],
            children: [],
            error: true,
            loading: false,
          });
      });
    return () => {
      live = false;
    };
  }, [revision]);
  const parent = data.categories.find((row) => row.id === category),
    needsChild = !!parent?.has_subcategories && !onlyParents;
  useEffect(() => {
    onRequired(needsChild);
  }, [needsChild, onRequired]);
  const style =
    "h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100";
  const parents = data.categories.filter(
    (row) => !onlyParents || row.has_subcategories,
  );
  const children = data.children.filter((row) => row.category_id === category);
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="package-category">{t("fields.category_id")} *</Label>
        <select
          id="package-category"
          name="category_id"
          value={category}
          disabled={disabled || data.loading || data.error}
          className={style}
          onChange={(event) => onChange(event.target.value, "")}
        >
          <option value="">
            {t(data.loading ? "masterLoading" : "choosePackageCategory")}
          </option>
          {category && !parents.some((row) => row.id === category) && (
            <option value={category} disabled>
              {t("masterUnavailable")}
            </option>
          )}
          {parents.map((row) => (
            <option
              key={row.id}
              value={row.id}
              disabled={!row.is_active && row.id !== category}
            >
              {row.name}
              {!row.is_active ? ` (${t("inactive")})` : ""}
            </option>
          ))}
        </select>
      </div>
      {needsChild && (
        <div className="space-y-2">
          <Label htmlFor="package-subcategory">
            {t("fields.subcategory_id")} *
          </Label>
          <select
            id="package-subcategory"
            name="subcategory_id"
            value={subcategory}
            disabled={disabled || data.loading || data.error}
            className={style}
            onChange={(event) => onChange(category, event.target.value)}
          >
            <option value="">{t("choosePackageSubcategory")}</option>
            {subcategory && !children.some((row) => row.id === subcategory) && (
              <option value={subcategory} disabled>
                {t("masterUnavailable")}
              </option>
            )}
            {children.map((row) => (
              <option
                key={row.id}
                value={row.id}
                disabled={!row.is_active && row.id !== subcategory}
              >
                {row.name}
                {!row.is_active ? ` (${t("inactive")})` : ""}
              </option>
            ))}
          </select>
        </div>
      )}
      {data.error ? (
        <div
          role="alert"
          className="space-y-2 text-sm text-error-600 dark:text-error-400"
        >
          <p>{t("packageLoadError")}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => {
              setData((current) => ({
                ...current,
                loading: true,
                error: false,
              }));
              setRevision((current) => current + 1);
            }}
          >
            {t("refresh")}
          </Button>
        </div>
      ) : (
        !data.loading &&
        (!parents.length || (needsChild && !children.length)) && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("packageMasterEmpty")}
          </p>
        )
      )}
    </div>
  );
}
