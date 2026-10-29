import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import CrewSection from "@/components/crew/CrewSection";
import { publicCrew } from "@/lib/crew/public";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("crew");
  return {
    title: `${t("title")} | ${t("brand")}`,
    description: t("publicDescription"),
  };
}
export default async function PublicCrewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("crew");
  const { members, failed } = await publicCrew();
  return (
    <div className="min-h-dvh bg-gray-25 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <nav
        aria-label={t("brand")}
        className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-5 py-7 sm:px-8 dark:border-gray-800"
      >
        <span className="font-editorial text-xl tracking-wide">
          {t("brand")}
        </span>
        <a
          href="#the-crew"
          className="text-sm text-gray-600 dark:text-gray-300"
        >
          {t("title")}
        </a>
      </nav>
      <main>
        <CrewSection members={members} failed={failed} />
      </main>
    </div>
  );
}
