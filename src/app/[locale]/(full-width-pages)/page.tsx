import { publicMetadata, siteIdentity, safeJsonLd } from "@/lib/wedding/seo";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { activeTemplate } from "@/lib/wedding/template";
import { weddingPageContent } from "@/lib/wedding/page-content";
import StyleOneWebsite from "@/components/wedding/StyleOneWebsite";
import StyleTwoWebsite from "@/components/wedding-luxe/StyleTwoWebsite";
export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const { data } = await weddingPageContent();
  const t = await getTranslations("wedding");
  return publicMetadata(data, {
    brand: t("seoBrand"),
    title: t.raw("seoTitle"),
    description: t("seoDescription"),
  });
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
  const identity = siteIdentity(content);
  const page =
    template === "style-2" ? (
      <StyleTwoWebsite content={content} />
    ) : (
      <StyleOneWebsite content={content} />
    );
  return (
    <>
      {identity && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(identity) }}
        />
      )}
      {page}
    </>
  );
}
