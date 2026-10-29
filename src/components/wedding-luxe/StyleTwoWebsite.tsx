import { Cormorant_Garamond, Manrope } from "next/font/google";
import { getTranslations } from "next-intl/server";
import type { WeddingPageContent } from "@/lib/wedding/page-content";
import { publishedSections } from "@/lib/wedding/sections";
import PublishedEmpty from "@/components/wedding/PublishedEmpty";
import LuxeHeader from "./LuxeHeader";
import LuxeHero from "./LuxeHero";
import LuxeServices from "./LuxeServices";
import LuxeFilm from "./LuxeFilm";
import LuxeCrew from "./LuxeCrew";
import LuxeGallery from "./LuxeGallery";
import LuxeContact from "./LuxeContact";
import LuxeMotion from "./LuxeMotion";
import styles from "./Luxe.module.css";

const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-luxe-display",
  display: "swap",
});
const sans = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-luxe-sans",
  display: "swap",
});
export default async function StyleTwoWebsite({
  content,
}: {
  content: WeddingPageContent;
}) {
  const t = await getTranslations("wedding");
  const sections = publishedSections(content);
  return (
    <div
      id="livina-luxe"
      lang="id"
      className={`${styles.site} ${display.variable} ${sans.variable}`}
    >
      {sections.ids[0] && (
        <a href={`#${sections.ids[0]}`} className={styles.skip}>
          {t("skip")}
        </a>
      )}
      {content.hero.brand_name && (
        <LuxeHeader
          brand={content.hero.brand_name}
          logo={content.settings?.logo_media_id}
          sections={sections.ids}
        />
      )}
      <main id="top">
        {sections.empty && <PublishedEmpty />}
        {sections.hero && (
          <LuxeHero
            title={content.hero.hero_title}
            subtitle={content.hero.hero_subtitle}
            poster={content.hero.hero_poster_url}
            nextSection={sections.ids[0]}
            hasVideo={!!content.hero.hero_video_url}
            brand={content.hero.brand_name}
          />
        )}
        {content.services.length > 0 && (
          <LuxeServices services={content.services} />
        )}
        {content.hero.hero_video_url && (
          <LuxeFilm
            video={content.hero.hero_video_url}
            poster={content.hero.hero_poster_url}
            title={content.hero.film_title}
          />
        )}
        {content.team_members.length > 0 && (
          <LuxeCrew members={content.team_members} preview={false} />
        )}
        {content.testimonials.length > 0 && (
          <LuxeGallery testimonials={content.testimonials} />
        )}
        {sections.footer && <LuxeContact content={content} />}
      </main>
      <LuxeMotion />
    </div>
  );
}
