"use client";

import { useTranslations } from "next-intl";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Button from "@/components/ui/button/Button";
import type { CrewMember, CrewQuery, ListMeta } from "@/lib/crew/types";
import CrewPortrait from "./CrewPortrait";

interface CrewTableProps {
  members: CrewMember[];
  meta: ListMeta | null;
  query: CrewQuery;
  busy: boolean;
  permissions: string[];
  onQuery: (query: CrewQuery) => void;
  onDetail: (member: CrewMember) => void;
  onEdit: (member: CrewMember) => void;
  onDelete: (member: CrewMember) => void;
}
export default function CrewTable({
  members,
  meta,
  query,
  busy,
  permissions,
  onQuery,
  onDetail,
  onEdit,
  onDelete,
}: CrewTableProps) {
  const t = useTranslations("crew");
  const can = (action: string, member: CrewMember) =>
    permissions.includes(`team_members.${action}`) &&
    (member.status !== "published" ||
      permissions.includes("team_members.publish"));
  const cell = "px-4 py-4 text-start text-sm text-gray-700 dark:text-gray-300";
  return (
    <div aria-busy={busy} className="space-y-4">
      {busy && (
        <p role="status" className="text-sm text-gray-500 dark:text-gray-400">
          {t("loading")}
        </p>
      )}
      <div className="max-w-full overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
        <Table>
          <TableHeader className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
            <TableRow>
              {["name", "role", "biography", "status", "order", "actions"].map(
                (key) => (
                  <TableCell
                    key={key}
                    isHeader
                    className={`${cell} font-medium whitespace-nowrap`}
                  >
                    {t(key)}
                  </TableCell>
                ),
              )}
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {members.map((member) => (
              <TableRow key={member.id}>
                <TableCell className={cell}>
                  <div className="flex items-center gap-3">
                    <CrewPortrait
                      id={
                        permissions.includes("media.read")
                          ? member.photo_media_id
                          : null
                      }
                      name={member.name}
                    />
                    <span className="min-w-32 font-medium text-gray-900 dark:text-gray-100">
                      {member.name}
                      {member.is_founder && (
                        <small className="block text-xs text-brand-600 dark:text-brand-400">
                          {t("isFounder")}
                        </small>
                      )}
                    </span>
                  </div>
                </TableCell>
                <TableCell className={cell}>{member.role_title}</TableCell>
                <TableCell className={cell}>
                  <p className="line-clamp-2 w-52 break-words whitespace-pre-line">
                    {member.biography}
                  </p>
                </TableCell>
                <TableCell className={cell}>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${member.status === "published" ? "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"}`}
                  >
                    {t(member.status)}
                  </span>
                </TableCell>
                <TableCell className={cell}>{member.sort_order}</TableCell>
                <TableCell className={cell}>
                  <div className="flex items-center gap-3 whitespace-nowrap">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onDetail(member)}
                      className="font-medium text-gray-700 disabled:opacity-50 dark:text-gray-300"
                    >
                      {t("detail")}
                    </button>
                    {can("update", member) && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onEdit(member)}
                        className="font-medium text-brand-600 disabled:opacity-50 dark:text-brand-400"
                      >
                        {t("edit")}
                      </button>
                    )}
                    {can("delete", member) && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onDelete(member)}
                        className="font-medium text-error-600 disabled:opacity-50 dark:text-error-400"
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
        {!members.length && !busy && (
          <div className="px-5 py-12 text-center">
            <p className="font-medium text-gray-800 dark:text-gray-200">
              {t("empty")}
            </p>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {t("emptyHint")}
            </p>
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1 text-sm text-gray-500 dark:text-gray-400">
          <p>{t("total", { total: meta?.total_data || 0 })}</p>
          <p>
            {t("page", {
              page: meta?.total_pages ? meta.page : 0,
              pages: meta?.total_pages || 0,
            })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label
            htmlFor="crew-per-page"
            className="text-sm text-gray-600 dark:text-gray-300"
          >
            {t("perPage")}
          </label>
          <select
            id="crew-per-page"
            value={query.perPage}
            onChange={(event) =>
              onQuery({
                ...query,
                perPage: Number(event.target.value),
                page: 1,
              })
            }
            className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          >
            {[10, 25, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy || !meta?.has_previous_page}
            onClick={() => onQuery({ ...query, page: query.page - 1 })}
          >
            {t("previous")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy || !meta?.has_next_page}
            onClick={() => onQuery({ ...query, page: query.page + 1 })}
          >
            {t("next")}
          </Button>
        </div>
      </div>
    </div>
  );
}
