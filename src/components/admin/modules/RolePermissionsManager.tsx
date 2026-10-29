"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import { allAccessRows, adminRequest, AdminApiError } from "@/lib/admin/client";
import type { AdminRecord } from "@/lib/admin/modules";
import type { SessionContext } from "@/lib/crew/types";
import { selectClass } from "./AdminFieldControl";

export default function RolePermissionsManager({
  context,
}: {
  context: SessionContext;
}) {
  const t = useTranslations("management");
  const [roles, setRoles] = useState<AdminRecord[]>([]);
  const [permissions, setPermissions] = useState<AdminRecord[]>([]);
  const [links, setLinks] = useState<AdminRecord[]>([]);
  const [role, setRole] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(false);
  const [busy, setBusy] = useState(true);
  const [revision, setRevision] = useState(0);
  const lock = useRef(false);
  const readable = [
    "roles.read",
    "permissions.read",
    "role_permissions.read",
  ].every((p) => context.permissions.includes(p));
  useEffect(() => {
    if (!readable) return;
    let active = true;
    const timer = setTimeout(async () => {
      setBusy(true);
      try {
        const [r, p, l] = await Promise.all([
          allAccessRows("roles"),
          allAccessRows("permissions"),
          allAccessRows("role_permissions"),
        ]);
        if (!active) return;
        setRoles(r);
        setPermissions(p);
        setLinks(l);
        setRole("");
        setSelected([]);
        setError("");
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
  }, [revision, readable]);
  const system = roles.find((item) => item.id === role)?.code === "admin";
  const original = links
    .filter((item) => item.role_id === role)
    .map((item) => String(item.permission_id));
  const dirty = [...selected].sort().join() !== original.sort().join();
  const groups = [...new Set(permissions.map((item) => String(item.module)))];
  const editable = context.user.role === "admin" && !system;
  function choose(id: string) {
    setRole(id);
    setSelected(
      links
        .filter((item) => item.role_id === id)
        .map((item) => String(item.permission_id)),
    );
    setNotice(false);
  }
  async function save() {
    if (lock.current || !editable || !role) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await adminRequest("rest/v1/rpc/set_role_permissions", "POST", {
        p_role_id: role,
        p_permission_ids: selected,
      });
      setLinks([
        ...links.filter((item) => item.role_id !== role),
        ...selected.map((id) => ({
          id: `${role}-${id}`,
          role_id: role,
          permission_id: id,
        })),
      ]);
      setNotice(true);
    } catch (error) {
      setError(error instanceof AdminApiError ? error.code : "network");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle={t("modules.rolePermissions")} />
      <ComponentCard
        title={t("modules.rolePermissions")}
        desc={t("rolePermissionsHint")}
      >
        {!readable ? (
          <p className="text-error-600 dark:text-error-400">
            {t("errors.forbidden")}
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-3">
              <select
                value={role}
                disabled={busy || dirty}
                onChange={(event) => choose(event.target.value)}
                aria-label={t("chooseRole")}
                className={`${selectClass} max-w-sm`}
              >
                <option value="">{t("chooseRole")}</option>
                {roles.map((item) => (
                  <option key={item.id} value={item.id}>
                    {String(item.name)}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="outline"
                disabled={busy || dirty}
                onClick={() => setRevision((r) => r + 1)}
              >
                {t("refresh")}
              </Button>
            </div>
            {error && (
              <p
                role="alert"
                className="text-sm text-error-600 dark:text-error-400"
              >
                {t(`errors.${error}`)}
              </p>
            )}
            {notice && (
              <p
                role="status"
                className="text-sm text-success-700 dark:text-success-400"
              >
                {t("saved")}
              </p>
            )}
            {system && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t("systemRoleHint")}
              </p>
            )}
            {role && (
              <div className="grid gap-4 md:grid-cols-2">
                {groups.map((group) => (
                  <fieldset
                    key={group}
                    disabled={!editable || busy}
                    className="rounded-xl border border-gray-200 p-4 dark:border-gray-700"
                  >
                    <legend className="px-2 text-sm font-semibold text-gray-800 dark:text-gray-100">
                      {t.has(`permissionGroups.${group}`)
                        ? t(`permissionGroups.${group}`)
                        : group}
                    </legend>
                    <div className="space-y-3">
                      {permissions
                        .filter((item) => item.module === group)
                        .map((item) => (
                          <label
                            key={item.id}
                            className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300"
                          >
                            <input
                              type="checkbox"
                              className="mt-1 size-4 accent-brand-500"
                              checked={system || selected.includes(item.id)}
                              onChange={(event) =>
                                setSelected((current) =>
                                  event.target.checked
                                    ? [...current, item.id]
                                    : current.filter((id) => id !== item.id),
                                )
                              }
                            />
                            <span>
                              {String(item.name)}
                              <small className="block text-xs text-gray-500 dark:text-gray-400">
                                {String(item.code)}
                              </small>
                            </span>
                          </label>
                        ))}
                    </div>
                  </fieldset>
                ))}
              </div>
            )}
            {role && editable && (
              <div className="flex flex-wrap items-center justify-end gap-3">
                {dirty && (
                  <span className="text-xs text-warning-700 dark:text-warning-400">
                    {t("unsaved")}
                  </span>
                )}
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy || !dirty}
                  onClick={() => setSelected(original)}
                >
                  {t("discard")}
                </Button>
                <Button type="button" disabled={busy || !dirty} onClick={save}>
                  {t(busy ? "saving" : "save")}
                </Button>
              </div>
            )}
          </>
        )}
      </ComponentCard>
    </div>
  );
}
