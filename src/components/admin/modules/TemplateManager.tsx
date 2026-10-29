"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import { AdminApiError } from "@/lib/admin/client";
import type { SessionContext } from "@/lib/crew/types";
async function checkResponse(response: Response) {
  if (response.ok) return;
  const data = await response.json().catch(() => null);
  throw new AdminApiError(
    response.status === 401
      ? "session"
      : response.status === 403
        ? "forbidden"
        : data?.code === "MIGRATION_REQUIRED"
          ? "migration"
          : "unavailable",
    response.status,
  );
}
type TemplateCode = "style-1" | "style-2";
interface TemplateState {
  templates: { code: TemplateCode; name: string; description: string }[];
  active: TemplateCode;
}
export default function TemplateManager({
  context,
}: {
  context: SessionContext;
}) {
  const t = useTranslations("management");
  const [state, setState] = useState<TemplateState | null>(null);
  const [selected, setSelected] = useState<TemplateCode>("style-1");
  const [busy, setBusy] = useState(true);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const lock = useRef(false);
  const canRead =
    context.permissions.includes("templates.read") ||
    context.user.role === "admin";
  const canUpdate =
    context.permissions.includes("templates.update") ||
    context.user.role === "admin";
  useEffect(() => {
    if (!canRead) return;
    let active = true;
    const timer = setTimeout(async () => {
      setBusy(true);
      try {
        const response = await fetch("/api/admin/templates", {
          cache: "no-store",
        });
        await checkResponse(response);
        const result: TemplateState = await response.json();
        if (active) {
          setState(result);
          setSelected(result.active);
          setError("");
        }
      } catch (error) {
        if (active)
          setError(error instanceof AdminApiError ? error.code : "network");
      } finally {
        if (active) setBusy(false);
      }
    }, 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [revision, canRead]);
  async function save() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const response = await fetch("/api/admin/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: selected }),
      });
      await checkResponse(response);
      setState((current) =>
        current ? { ...current, active: selected } : current,
      );
      setSaved(true);
    } catch (error) {
      setError(error instanceof AdminApiError ? error.code : "network");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle={t("modules.templates")} />
      <ComponentCard title={t("modules.templates")} desc={t("templateHint")}>
        {!canRead ? (
          <p className="text-error-600 dark:text-error-400">
            {t("errors.forbidden")}
          </p>
        ) : (
          <>
            <div className="grid gap-5 md:grid-cols-2">
              {state?.templates.map((template) => (
                <label
                  key={template.code}
                  className={`relative cursor-pointer rounded-2xl border-2 p-6 transition ${selected === template.code ? "border-brand-500 bg-brand-50 dark:bg-brand-950" : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"}`}
                >
                  <div
                    className={`mb-5 flex h-32 items-center justify-center rounded-lg ${template.code === "style-1" ? "bg-gray-950 text-white" : "bg-luxe-ivory text-luxe-espresso"}`}
                  >
                    <span
                      className={
                        template.code === "style-1"
                          ? "text-2xl tracking-widest"
                          : "font-editorial text-3xl italic"
                      }
                    >
                      {template.name}
                    </span>
                  </div>
                  <span className="flex items-center gap-3 font-semibold text-gray-900 dark:text-gray-100">
                    <input
                      type="radio"
                      name="active-template"
                      value={template.code}
                      checked={selected === template.code}
                      disabled={!canUpdate || busy}
                      onChange={() => {
                        setSelected(template.code);
                        setSaved(false);
                      }}
                      className="size-4 accent-brand-500"
                    />
                    {template.name}
                    {state.active === template.code && (
                      <small className="text-success-700 dark:text-success-400">
                        {t("active")}
                      </small>
                    )}
                  </span>
                  <p className="mt-3 text-sm leading-6 text-gray-500 dark:text-gray-400">
                    {template.description}
                  </p>
                  <Link
                    href={`/${template.code}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-block text-sm text-brand-600 dark:text-brand-400"
                  >
                    {t("previewTemplate")}
                  </Link>
                </label>
              ))}
            </div>
            {busy && !state && (
              <p
                role="status"
                className="text-sm text-gray-500 dark:text-gray-400"
              >
                {t("loading")}
              </p>
            )}
            {error && (
              <p
                role="alert"
                className="text-sm text-error-600 dark:text-error-400"
              >
                {t(`errors.${error}`)}
              </p>
            )}
            {saved && (
              <p
                role="status"
                className="text-sm text-success-700 dark:text-success-400"
              >
                {t("templateSaved")}
              </p>
            )}
            <div className="flex flex-wrap justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => setRevision((r) => r + 1)}
              >
                {t("refresh")}
              </Button>
              <Button
                type="button"
                disabled={
                  busy || !state || !canUpdate || selected === state.active
                }
                onClick={save}
              >
                {t(busy ? "saving" : "activateTemplate")}
              </Button>
            </div>
          </>
        )}
      </ComponentCard>
    </div>
  );
}
