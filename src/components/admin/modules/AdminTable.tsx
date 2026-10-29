"use client";
import { useTranslations } from "next-intl";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import Button from "@/components/ui/button/Button";
import {
  modules,
  type AdminRecord,
  type ModuleCode,
} from "@/lib/admin/modules";
import type { ListMeta } from "@/lib/crew/types";

interface AdminTableProps {
  module: ModuleCode;
  rows: AdminRecord[];
  roles: AdminRecord[];
  busy: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canPublish: boolean;
  meta: ListMeta | null;
  onPage: (page: number) => void;
  onEdit: (record: AdminRecord) => void;
  onDelete: (record: AdminRecord) => void;
  onDetail: (record: AdminRecord) => void;
  onResetPassword?: (record: AdminRecord) => void;
  currentUserId?: string;
}
export default function AdminTable({
  module,
  rows,
  roles,
  busy,
  canEdit,
  canDelete,
  canPublish,
  meta,
  onPage,
  onEdit,
  onDelete,
  onDetail,
  onResetPassword,
  currentUserId,
}: AdminTableProps) {
  const t = useTranslations("management");
  const cell = "px-4 py-4 text-start text-sm text-gray-700 dark:text-gray-200";
  function display(row: AdminRecord, key: string) {
    const value = row[key];
    if (key === "role_id")
      return String(
        roles.find((role) => role.id === value)?.name || value || "—",
      );
    if (typeof value === "boolean") return t(value ? "active" : "inactive");
    if (key === "status") return t(String(value));
    return String(value ?? "—");
  }
  return (
    <>
      <div className="max-w-full overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <Table>
          <TableHeader className="bg-gray-50 dark:bg-gray-800">
            <TableRow>
              {modules[module].columns.map((key) => (
                <TableCell key={key} isHeader className={cell}>
                  {t(`fields.${key}`)}
                </TableCell>
              ))}
              <TableCell isHeader className={cell}>
                {t("actions")}
              </TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {rows.map((row) => (
              <TableRow key={row.id}>
                {modules[module].columns.map((key) => (
                  <TableCell
                    key={key}
                    className={`${cell} max-w-64 break-words`}
                  >
                    {display(row, key)}
                  </TableCell>
                ))}
                <TableCell className={cell}>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => onDetail(row)}
                      className="text-brand-600 dark:text-brand-400"
                    >
                      {t("detail")}
                    </button>
                    {canEdit && (row.status !== "published" || canPublish) && (
                      <button
                        type="button"
                        onClick={() => onEdit(row)}
                        className="text-brand-600 dark:text-brand-400"
                      >
                        {t("edit")}
                      </button>
                    )}
                    {module === "users" &&
                      onResetPassword &&
                      row.id !== currentUserId && (
                        <button
                          type="button"
                          onClick={() => onResetPassword(row)}
                          className="text-brand-600 dark:text-brand-400"
                        >
                          {t("resetPassword")}
                        </button>
                      )}
                    {canDelete &&
                      (row.status !== "published" || canPublish) &&
                      !(module === "roles" && row.code === "admin") && (
                        <button
                          type="button"
                          onClick={() => onDelete(row)}
                          className="text-error-600 dark:text-error-400"
                        >
                          {t("delete")}
                        </button>
                      )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!rows.length && (
          <p
            role="status"
            className="p-6 text-sm text-gray-500 dark:text-gray-400"
          >
            {t(busy ? "loading" : "empty")}
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("pagination", {
            page: meta?.page || 1,
            pages: meta?.total_pages || 0,
            total: meta?.total_data || 0,
          })}
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy || !meta?.has_previous_page}
            onClick={() => onPage((meta?.page || 1) - 1)}
          >
            {t("previous")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy || !meta?.has_next_page}
            onClick={() => onPage((meta?.page || 1) + 1)}
          >
            {t("next")}
          </Button>
        </div>
      </div>
    </>
  );
}
