import type { Metadata } from "next";
import type { WeddingPageContent } from "./page-content";
export const siteUrl = "https://livinawedding.vercel.app";
export function publicMetadata(
  content: WeddingPageContent,
  copy: { brand: string; title: string; description: string },
): Metadata {
  const brand = content.hero.brand_name || copy.brand,
    title = copy.title.replace("{brand}", brand),
    description = content.hero.hero_subtitle
      ? `${content.hero.hero_subtitle}. ${copy.description}`
      : copy.description;
  const image = siteUrl + "/images/logo-livina.png";
  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    alternates: { canonical: siteUrl + "/" },
    robots: { index: !!content.settings, follow: true },
    openGraph: {
      type: "website",
      url: siteUrl + "/",
      siteName: brand,
      title,
      description,
      locale: "id_ID",
      images: [{ url: image, alt: brand }],
    },
    twitter: { card: "summary", title, description, images: [image] },
  };
}
export function siteIdentity(content: WeddingPageContent) {
  if (!content.settings) return null;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": siteUrl + "/#organization",
        name: content.hero.brand_name,
        url: siteUrl + "/",
        logo: siteUrl + "/images/logo-livina.png",
        ...(content.settings.contact_email
          ? { email: content.settings.contact_email }
          : {}),
        sameAs: content.social_links
          .map((row) => row.url)
          .filter((url) => /^https?:\/\//.test(url)),
      },
      {
        "@type": "WebSite",
        "@id": siteUrl + "/#website",
        url: siteUrl + "/",
        name: content.hero.brand_name,
        inLanguage: "id-ID",
        publisher: { "@id": siteUrl + "/#organization" },
      },
    ],
  };
}
export function safeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
