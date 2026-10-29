import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { withAdminPermissions } from "@/lib/admin/permissions";
import CrewManager from "@/components/crew/CrewManager";
import { serverSession } from "@/lib/auth/server";
import { redirect } from "@/i18n/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("crew");
  return {
    title: `${t("adminTitle")} | ${t("brand")}`,
    robots: { index: false, follow: false },
  };
}
export default async function CrewAdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await serverSession();
  if (!session) return redirect({ href: "/admin", locale });
  return <CrewManager initialContext={withAdminPermissions(session.context)} />;
}
