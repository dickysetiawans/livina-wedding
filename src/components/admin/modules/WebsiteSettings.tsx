"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import type { SessionContext } from "@/lib/crew/types";
import type { AdminRecord } from "@/lib/admin/modules";
import { listAdmin, AdminApiError } from "@/lib/admin/client";
import AdminEditor from "./AdminEditor";
export default function WebsiteSettings({
  context,
}: {
  context: SessionContext;
}) {
  const t = useTranslations("websiteSettings"),
    m = useTranslations("management");
  const [record, setRecord] = useState<AdminRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [saved, setSaved] = useState(false);
  const canRead = context.permissions.includes("site_settings.read");
  useEffect(() => {
    if (!canRead) return;
    let active = true;
    void listAdmin("website", {
      page: 1,
      perPage: 1,
      search: "",
      status: "",
      direction: "asc",
    })
      .then((result) => {
        if (active) {
          setRecord(result.data[0] || null);
          setError("");
        }
      })
      .catch((error) => {
        if (active)
          setError(error instanceof AdminApiError ? error.code : "network");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [canRead, revision]);
  const canWrite = context.permissions.includes(
    `site_settings.${record ? "update" : "create"}`,
  );
  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle={m("modules.website")} />
      <p className="max-w-3xl text-sm leading-6 text-gray-500 dark:text-gray-400">
        {t("intro")}
      </p>
      <ComponentCard title={m("modules.website")}>
        {!canRead ? (
          <p role="alert" className="text-error-600 dark:text-error-400">
            {m("errors.forbidden")}
          </p>
        ) : loading ? (
          <p role="status" className="text-gray-500 dark:text-gray-400">
            {t("loading")}
          </p>
        ) : error ? (
          <div className="space-y-4">
            <p role="alert" className="text-error-600 dark:text-error-400">
              {m(`errors.${error}`)}
            </p>
            <Button
              onClick={() => {
                setLoading(true);
                setRevision((r) => r + 1);
              }}
            >
              {m("refresh")}
            </Button>
          </div>
        ) : (
          <>
            {saved && (
              <p
                role="status"
                className="text-sm text-success-700 dark:text-success-400"
              >
                {t("saved")}
              </p>
            )}
            <AdminEditor
              key={revision}
              module="website"
              record={record}
              roles={[]}
              permissions={context.permissions}
              inline
              readOnly={!canWrite}
              onClose={() => {}}
              onSaved={() => {
                setSaved(true);
                setLoading(true);
                setRevision((r) => r + 1);
              }}
            />
          </>
        )}
      </ComponentCard>
    </div>
  );
}
