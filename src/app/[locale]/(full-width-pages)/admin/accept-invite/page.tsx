import { setRequestLocale } from "next-intl/server";
import InviteAcceptance from "@/components/admin/InviteAcceptance";
export const metadata = { robots: { index: false, follow: false } };
export default async function AcceptInvitePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <InviteAcceptance />;
}
