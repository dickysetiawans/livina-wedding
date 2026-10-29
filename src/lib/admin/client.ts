"use client";
import {
  modules,
  adminPayload,
  validateAdminValues,
  type ModuleCode,
  type AdminRecord,
  type AdminValues,
} from "./modules";
import type { ListResult } from "@/lib/crew/types";

export class AdminApiError extends Error {
  constructor(
    public code: string,
    public status = 0,
  ) {
    super(code);
  }
}
export async function adminRequest<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/organizer/${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      credentials: "same-origin",
      signal: AbortSignal.timeout(30000),
    });
  } catch {
    throw new AdminApiError("network");
  }
  const result =
    response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const code = result?.code;
    if (code === "USER_EXISTS")
      throw new AdminApiError("duplicate", response.status);
    const message = String(result?.message || "");
    if (message.includes("Administrator aktif terakhir"))
      throw new AdminApiError("lastAdmin", response.status);
    if (message.includes("Role admin sistem"))
      throw new AdminApiError("systemRole", response.status);
    if (code === "VALIDATION")
      throw new AdminApiError("validation", response.status);
    throw new AdminApiError(
      response.status === 401
        ? "session"
        : response.status === 403
          ? "forbidden"
          : ["42P01", "42703", "PGRST202", "PGRST204", "PGRST205"].includes(
                code,
              )
            ? "migration"
            : code === "23505"
              ? "duplicate"
              : code === "23503"
                ? "inUse"
                : response.status === 503
                  ? "unavailable"
                  : "request",
      response.status,
    );
  }
  return result as T;
}
export interface AdminQuery {
  page: number;
  perPage: number;
  search: string;
  status: string;
  direction: "asc" | "desc";
}
export async function listAdmin(
  module: ModuleCode,
  query: AdminQuery,
): Promise<ListResult<AdminRecord>> {
  const definition = modules[module];
  if (definition.singleton) {
    const rows = await adminRequest<AdminRecord[]>(
      "rest/v1/site_settings?select=*&order=created_at.desc&limit=1",
    );
    return {
      data: rows,
      meta: {
        page: 1,
        per_page: 1,
        total_data: rows.length,
        total_pages: rows.length ? 1 : 0,
        has_next_page: false,
        has_previous_page: false,
      },
    };
  }
  return adminRequest("rest/v1/rpc/list_data", "POST", {
    p_module: definition.table,
    p_page: query.page,
    p_per_page: query.perPage,
    p_search: query.search.trim(),
    p_sort_by: definition.sort,
    p_sort_order: query.direction,
    p_filters: query.status ? { status: query.status } : {},
  });
}
export async function allAccessRows(
  table: "roles" | "permissions" | "role_permissions",
) {
  const records: AdminRecord[] = [];
  for (let page = 1; page <= 100; page++) {
    const result = await adminRequest<ListResult<AdminRecord>>(
      "rest/v1/rpc/list_data",
      "POST",
      {
        p_module: table,
        p_page: page,
        p_per_page: 100,
        p_search: "",
        p_sort_by: table === "roles" ? "name" : "code",
        p_sort_order: "asc",
        p_filters: {},
      },
    );
    records.push(...result.data);
    if (!result.meta.has_next_page) return records;
  }
  throw new AdminApiError("tooMany");
}
export async function saveAdmin(
  module: ModuleCode,
  value: AdminValues,
  id?: string,
) {
  if (Object.keys(validateAdminValues(module, value, Boolean(id))).length)
    throw new AdminApiError("validation");
  if (module === "users" && !id)
    return adminRequest("functions/v1/organizer-api", "POST", {
      action: "create-user",
      ...adminPayload(module, value),
    });
  const rows = await adminRequest<AdminRecord[]>(
    `rest/v1/${modules[module].table}${id ? `?id=eq.${id}` : ""}`,
    id ? "PATCH" : "POST",
    adminPayload(module, value, Boolean(id)),
  );
  if (!rows.length) throw new AdminApiError("stale");
  return rows[0];
}
export async function deleteAdmin(module: ModuleCode, id: string) {
  const rows = await adminRequest<AdminRecord[]>(
    `rest/v1/${modules[module].table}?id=eq.${id}`,
    "DELETE",
  );
  if (!rows.length) throw new AdminApiError("stale");
}
