import { getTranslations, setRequestLocale } from "next-intl/server";
import { weddingPageContent } from "@/lib/wedding/page-content";
import StyleOneWebsite from "@/components/wedding/StyleOneWebsite";
export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const t = await getTranslations("wedding");
  return { title: t("metaTitle"), description: t("metaDescription") };
}
export default async function WeddingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { data: content } = await weddingPageContent();
  return <StyleOneWebsite content={content} />;
}
