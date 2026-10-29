import { getTranslations, setRequestLocale } from "next-intl/server";
import { serverSession } from "@/lib/auth/server";
import { Link, redirect } from "@/i18n/navigation";
import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const auth = await serverSession();
  if (!auth) return redirect({ href: "/admin", locale });
  const t = await getTranslations("management");
  const a = await getTranslations("admin");
  const links = [
    { key: "crew", path: "crew", permission: "team_members.read" },
    { key: "clients", path: "clients", permission: "testimonials.read" },
    { key: "services", path: "services", permission: "services.read" },
    { key: "website", path: "website", permission: "site_settings.read" },
    { key: "templates", path: "templates", permission: "templates.read" },
    { key: "users", path: "users", permission: "users.read" },
    { key: "roles", path: "roles", permission: "roles.read" },
    { key: "permissions", path: "permissions", permission: "permissions.read" },
    {
      key: "rolePermissions",
      path: "role-permissions",
      permission: "role_permissions.read",
    },
  ];
  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle={t("dashboard")} />
      <ComponentCard
        title={a("welcome", { name: auth.context.user.name })}
        desc={a("description")}
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {links
            .filter(
              (item) =>
                auth.context.user.role === "admin" ||
                auth.context.permissions.includes(item.permission),
            )
            .map((item) => (
              <Link
                key={item.key}
                href={`/admin/${item.path}`}
                className="rounded-xl border border-gray-200 bg-white p-5 text-gray-800 transition hover:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:border-brand-400"
              >
                <h2 className="text-lg font-medium">
                  {t(`modules.${item.key}`)}
                </h2>
                <p className="mt-2 text-xs leading-5 text-gray-500 dark:text-gray-400">
                  {t.has(`descriptions.${item.key}`)
                    ? t(`descriptions.${item.key}`)
                    : item.key === "crew"
                      ? a("crewHint")
                      : item.key === "templates"
                        ? t("templateHint")
                        : t("rolePermissionsHint")}
                </p>
              </Link>
            ))}
          <Link
            href="/"
            className="rounded-xl border border-gray-200 bg-white p-5 text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          >
            <h2 className="text-lg font-medium">{a("website")}</h2>
            <p className="mt-2 text-xs leading-5 text-gray-500 dark:text-gray-400">
              {a("websiteHint")}
            </p>
          </Link>
        </div>
      </ComponentCard>
    </div>
  );
}
