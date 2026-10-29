"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import CrewDialog from "@/components/crew/CrewDialog";
import CrewPortrait from "@/components/crew/CrewPortrait";
import { useModal } from "@/hooks/useModal";
import type { ListResult, SessionContext } from "@/lib/crew/types";
import {
  modules,
  type ModuleCode,
  type AdminRecord,
} from "@/lib/admin/modules";
import {
  listAdmin,
  allAccessRows,
  deleteAdmin,
  AdminApiError,
  type AdminQuery,
} from "@/lib/admin/client";
import WebsiteSettings from "./WebsiteSettings";
import AdminEditor from "./AdminEditor";
import AdminTable from "./AdminTable";
import PasswordDialog from "../PasswordDialog";
import { selectClass } from "./AdminFieldControl";

interface AdminManagerProps {
  module: ModuleCode;
  context: SessionContext;
}
export default function AdminManager(props: AdminManagerProps) {
  return props.module === "website" ? (
    <WebsiteSettings context={props.context} />
  ) : (
    <ModuleManager {...props} />
  );
}
function ModuleManager({ module, context }: AdminManagerProps) {
  const t = useTranslations("management");
  const router = useRouter();
  const definition = modules[module];
  const [query, setQuery] = useState<AdminQuery>({
    page: 1,
    perPage: 10,
    search: "",
    status: "",
    direction: "asc",
  });
  const [result, setResult] = useState<ListResult<AdminRecord> | null>(null);
  const [roles, setRoles] = useState<AdminRecord[]>([]);
  const [busy, setBusy] = useState(true);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState<AdminRecord | null>(null);
  const [detail, setDetail] = useState<AdminRecord | null>(null);
  const [removing, setRemoving] = useState<AdminRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [resettingPassword, setResettingPassword] =
    useState<AdminRecord | null>(null);
  const lock = useRef(false);
  const editor = useModal();
  const canRead = context.permissions.includes(`${definition.permission}.read`);
  const can = (action: string) =>
    (!definition.adminOnly || context.user.role === "admin") &&
    context.permissions.includes(`${definition.permission}.${action}`);
  useEffect(() => {
    if (!canRead) return;
    let active = true;
    const timer = setTimeout(async () => {
      setBusy(true);
      setError("");
      try {
        const [data, options] = await Promise.all([
          listAdmin(module, query),
          module === "users" && context.permissions.includes("roles.read")
            ? allAccessRows("roles")
            : Promise.resolve([]),
        ]);
        if (!active) return;
        if (data.meta.total_pages > 0 && query.page > data.meta.total_pages) {
          setQuery((current) => ({ ...current, page: data.meta.total_pages }));
          return;
        }
        if (data.meta.total_pages === 0 && query.page > 1) {
          setQuery((current) => ({ ...current, page: 1 }));
          return;
        }
        setResult(data);
        setRoles(options);
      } catch (error) {
        if (!active) return;
        setResult(null);
        setError(error instanceof AdminApiError ? error.code : "network");
        if (error instanceof AdminApiError && error.status === 401) {
          router.replace("/admin");
          router.refresh();
        }
      } finally {
        if (active) setBusy(false);
      }
    }, 200);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [module, query, revision, canRead, context.permissions, router]);
  async function remove() {
    if (!removing || lock.current) return;
    lock.current = true;
    setDeleting(true);
    setError("");
    try {
      await deleteAdmin(module, removing.id);
      setRemoving(null);
      setNotice("deleted");
      setRevision((r) => r + 1);
    } catch (error) {
      setError(error instanceof AdminApiError ? error.code : "network");
    } finally {
      lock.current = false;
      setDeleting(false);
    }
  }
  return (
    <div className="min-w-0 space-y-6">
      <PageBreadcrumb pageTitle={t(`modules.${module}`)} />
      <p className="max-w-3xl text-sm leading-6 text-gray-500 dark:text-gray-400">
        {t(`descriptions.${module}`)}
      </p>
      {!canRead ? (
        <p role="alert" className="text-error-600 dark:text-error-400">
          {t("errors.forbidden")}
        </p>
      ) : (
        <ComponentCard title={t(`modules.${module}`)}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => setRevision((r) => r + 1)}
            >
              {t("refresh")}
            </Button>
            {can("create") &&
              !(definition.singleton && Boolean(result?.data.length)) && (
                <Button
                  type="button"
                  size="sm"
                  disabled={busy}
                  onClick={() => {
                    setSelected(null);
                    editor.openModal();
                  }}
                >
                  {t("add")}
                </Button>
              )}
          </div>
          {!definition.singleton && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Input
                aria-label={t("search")}
                placeholder={t("search")}
                value={query.search}
                maxLength={100}
                onChange={(event) =>
                  setQuery((q) => ({
                    ...q,
                    search: event.target.value,
                    page: 1,
                  }))
                }
              />
              <select
                className={selectClass}
                aria-label={t("perPage")}
                value={query.perPage}
                onChange={(event) =>
                  setQuery((q) => ({
                    ...q,
                    perPage: Number(event.target.value),
                    page: 1,
                  }))
                }
              >
                {[10, 25, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {t("rows", { count: n })}
                  </option>
                ))}
              </select>
              <select
                className={selectClass}
                aria-label={t("direction")}
                value={query.direction}
                onChange={(event) =>
                  setQuery((q) => ({
                    ...q,
                    direction: event.target.value as "asc" | "desc",
                    page: 1,
                  }))
                }
              >
                <option value="asc">{t("ascending")}</option>
                <option value="desc">{t("descending")}</option>
              </select>
              {definition.fields.some((field) => field.type === "status") && (
                <select
                  className={selectClass}
                  aria-label={t("fields.status")}
                  value={query.status}
                  onChange={(event) =>
                    setQuery((q) => ({
                      ...q,
                      status: event.target.value,
                      page: 1,
                    }))
                  }
                >
                  <option value="">{t("allStatus")}</option>
                  <option value="draft">{t("draft")}</option>
                  <option value="published">{t("published")}</option>
                </select>
              )}
            </div>
          )}
          {notice && (
            <p
              role="status"
              className="text-sm text-success-700 dark:text-success-400"
            >
              {t(notice)}
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
          <AdminTable
            module={module}
            rows={result?.data || []}
            roles={roles}
            busy={busy}
            canEdit={can("update")}
            canDelete={!definition.singleton && can("delete")}
            canPublish={can("publish")}
            meta={result?.meta || null}
            onPage={(page) => setQuery((q) => ({ ...q, page }))}
            onEdit={(record) => {
              setSelected(record);
              editor.openModal();
            }}
            onDelete={(record) => {
              setRemoving(record);
              setError("");
            }}
            onDetail={setDetail}
            currentUserId={context.user.id}
            onResetPassword={
              module === "users" && context.user.role === "admin"
                ? setResettingPassword
                : undefined
            }
          />
        </ComponentCard>
      )}
      {editor.isOpen && (
        <AdminEditor
          module={module}
          record={selected}
          roles={roles}
          permissions={context.permissions}
          onClose={editor.closeModal}
          onSaved={() => {
            editor.closeModal();
            setNotice(module === "users" && !selected ? "invited" : "saved");
            setRevision((r) => r + 1);
            if (["users", "roles", "permissions"].includes(module))
              router.refresh();
          }}
        />
      )}
      {resettingPassword && (
        <PasswordDialog
          target={{
            id: resettingPassword.id,
            name: String(resettingPassword.name || resettingPassword.email),
          }}
          onClose={() => setResettingPassword(null)}
        />
      )}
      {detail && (
        <CrewDialog title={t("detail")} onClose={() => setDetail(null)}>
          <dl className="space-y-4">
            {definition.fields.map((field) => (
              <div key={field.key}>
                <dt className="text-xs text-gray-500 dark:text-gray-400">
                  {t(`fields.${field.key}`)}
                </dt>
                <dd className="mt-1 text-sm break-words whitespace-pre-line text-gray-800 dark:text-gray-100">
                  {field.type === "image" &&
                  detail[field.key] &&
                  context.permissions.includes("media.read") ? (
                    <CrewPortrait
                      id={String(detail[field.key])}
                      name={String(
                        detail.name || detail.title || detail.couple_name || "",
                      )}
                      className="h-32 w-32"
                    />
                  ) : typeof detail[field.key] === "boolean" ? (
                    t(detail[field.key] ? "yes" : "no")
                  ) : field.key === "role_id" ? (
                    String(
                      roles.find((role) => role.id === detail.role_id)?.name ||
                        detail.role_id,
                    )
                  ) : (
                    String(detail[field.key] ?? "—")
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </CrewDialog>
      )}
      {removing && (
        <CrewDialog
          title={t("delete")}
          onClose={() => setRemoving(null)}
          busy={deleting}
        >
          <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">
            {t(
              module === "users"
                ? "deleteUserHint"
                : module === "permissions"
                  ? "deletePermissionHint"
                  : "deleteHint",
              {
                name: String(
                  removing.name ||
                    removing.title ||
                    removing.couple_name ||
                    removing.code,
                ),
              },
            )}
          </p>
          {error && (
            <p
              role="alert"
              className="mt-4 text-sm text-error-600 dark:text-error-400"
            >
              {t(`errors.${error}`)}
            </p>
          )}
          <div className="mt-5 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={deleting}
              onClick={() => setRemoving(null)}
            >
              {t("cancel")}
            </Button>
            <Button type="button" disabled={deleting} onClick={remove}>
              {t(deleting ? "saving" : "delete")}
            </Button>
          </div>
        </CrewDialog>
      )}
    </div>
  );
}
