import type { SessionContext } from "@/lib/crew/types";
// Role admin sistem pada SQL memiliki seluruh izin, termasuk ketika sebuah
// baris katalog belum di-seed. Ini menyelaraskan UI dengan otorisasi SQL.
export function withAdminPermissions(context: SessionContext): SessionContext {
  if (context.user.role !== "admin") return context;
  const permissions = [...context.permissions];
  for (const area of [
    "users",
    "roles",
    "permissions",
    "role_permissions",
    "team_members",
    "testimonials",
    "services",
    "site_settings",
    "social_links",
    "media",
    "templates",
  ])
    for (const action of ["read", "create", "update", "delete", "publish"])
      permissions.push(`${area}.${action}`);
  return { ...context, permissions: [...new Set(permissions)] };
}
