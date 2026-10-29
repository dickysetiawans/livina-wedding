import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { redirect } from "@/i18n/navigation";
import { serverSession } from "@/lib/auth/server";
import { withAdminPermissions } from "@/lib/admin/permissions";
import { isModuleCode } from "@/lib/admin/modules";
import AdminManager from "@/components/admin/modules/AdminManager";
import RolePermissionsManager from "@/components/admin/modules/RolePermissionsManager";
import TemplateManager from "@/components/admin/modules/TemplateManager";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ module: string }>;
}) {
  const { module } = await params;
  const t = await getTranslations("management");
  return {
    title: isModuleCode(module)
      ? t(`modules.${module}`)
      : t(
          module === "templates"
            ? "modules.templates"
            : "modules.rolePermissions",
        ),
    robots: { index: false, follow: false },
  };
}
export default async function AdminModulePage({
  params,
}: {
  params: Promise<{ locale: string; module: string }>;
}) {
  const { locale, module } = await params;
  setRequestLocale(locale);
  const auth = await serverSession();
  if (!auth) return redirect({ href: "/admin", locale });
  const context = withAdminPermissions(auth.context);
  if (module === "templates") return <TemplateManager context={context} />;
  if (module === "role-permissions")
    return <RolePermissionsManager context={context} />;
  if (!isModuleCode(module)) notFound();
  return <AdminManager key={module} module={module} context={context} />;
}
