import { getTranslations, setRequestLocale } from "next-intl/server";
import { activeTemplate } from "@/lib/wedding/template";
import { weddingPageContent } from "@/lib/wedding/page-content";
import StyleOneWebsite from "@/components/wedding/StyleOneWebsite";
import StyleTwoWebsite from "@/components/wedding-luxe/StyleTwoWebsite";
export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const { data } = await weddingPageContent();
  const t = await getTranslations("wedding");
  return {
    title: data.hero.brand_name || t("metaTitle"),
    description: data.hero.hero_subtitle || "",
  };
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [template, { data: content }] = await Promise.all([
    activeTemplate(),
    weddingPageContent(),
  ]);
  return template === "style-2" ? (
    <StyleTwoWebsite content={content} />
  ) : (
    <StyleOneWebsite content={content} />
  );
}
