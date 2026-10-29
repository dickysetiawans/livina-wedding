import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { serverSession } from "@/lib/auth/server";
import AdminShell from "@/components/admin/AdminShell";
export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };
export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await serverSession();
  if (!session) return redirect({ href: "/admin", locale });
  return (
    <AdminShell
      user={session.context.user}
      permissions={session.context.permissions}
    >
      {children}
    </AdminShell>
  );
}
