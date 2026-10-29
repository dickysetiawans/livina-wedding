import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
export const metadata = { robots: { index: false, follow: false } };
export default async function AuthAlias({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return redirect({ href: "/admin", locale });
}
