import { getTranslations } from "next-intl/server";
import { Montserrat, Playfair_Display } from "next/font/google";
import Image from "next/image";
import type { WeddingPageContent } from "@/lib/wedding/page-content";
import { publishedSections } from "@/lib/wedding/sections";
import WeddingHero from "./WeddingHero";
import WeddingServices from "./WeddingServices";
import WeddingCrew from "./WeddingCrew";
import WeddingGallery from "./WeddingGallery";
import WeddingContact from "./WeddingContact";
import WeddingMotion from "./WeddingMotion";
import PublishedEmpty from "./PublishedEmpty";
import styles from "./Wedding.module.css";

const sans = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-public",
});
const editorial = Playfair_Display({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
  variable: "--font-wedding-serif",
});
export default async function StyleOneWebsite({
  content,
}: {
  content: WeddingPageContent;
}) {
  const t = await getTranslations("wedding");
  const sections = publishedSections(content);
  const brand = content.hero.brand_name;
  return (
    <div
      id="livina-website"
      lang="id"
      className={`${styles.landing} ${sans.variable} ${editorial.variable}`}
    >
      {sections.ids[0] && (
        <a className={styles.skipLink} href={`#${sections.ids[0]}`}>
          {t("skip")}
        </a>
      )}
      {brand && (
        <header className={styles.header}>
          <a href="#top" aria-label={brand} className={styles.wordmark}>
            {content.settings?.logo_media_id ? (
              <Image
                src={`/api/wedding/media/${content.settings.logo_media_id}`}
                alt=""
                width={48}
                height={48}
                unoptimized
                className="object-contain"
              />
            ) : (
              <span className={styles.monogram}>
                L<span>W</span>
              </span>
            )}
            <span>{brand}</span>
          </a>
        </header>
      )}
      <main id="top">
        {sections.empty && <PublishedEmpty />}
        {sections.hero && (
          <WeddingHero
            filmTitle={content.hero.film_title}
            title={content.hero.hero_title}
            subtitle={content.hero.hero_subtitle}
            video={content.hero.hero_video_url}
            poster={content.hero.hero_poster_url}
            nextSection={sections.ids[0]}
          />
        )}
        {content.services.length > 0 && (
          <WeddingServices services={content.services} />
        )}
        {content.team_members.length > 0 && (
          <WeddingCrew members={content.team_members} />
        )}
        {content.testimonials.length > 0 && (
          <WeddingGallery testimonials={content.testimonials} />
        )}
        {sections.footer && <WeddingContact content={content} />}
      </main>
      <WeddingMotion />
    </div>
  );
}
