import { getTranslations, setRequestLocale } from "next-intl/server";
import { serverSession } from "@/lib/auth/server";
import { redirect } from "@/i18n/navigation";
import AdminLogin from "@/components/admin/AdminLogin";

export async function generateMetadata() {
  const t = await getTranslations("admin");
  return {
    title: `${t("login")} | ${t("brand")}`,
    robots: { index: false, follow: false },
  };
}
export default async function AdminLoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (await serverSession()) redirect({ href: "/dashboard", locale });
  return <AdminLogin />;
}
