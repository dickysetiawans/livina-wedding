import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { ArrowDownIcon, ArrowRightIcon } from "@/icons";
import styles from "./Luxe.module.css";

interface LuxeHeroProps {
  title: string;
  subtitle: string;
  poster: string;
  nextSection?: string;
  hasVideo: boolean;
  brand: string;
}
export default async function LuxeHero({
  title,
  subtitle,
  poster,
  nextSection,
  hasVideo,
  brand,
}: LuxeHeroProps) {
  const t = await getTranslations("luxe");
  const words = title.trim().split(/\s+/);
  return (
    <section
      className={styles.hero}
      aria-labelledby={title ? "luxe-title" : undefined}
    >
      <div className={styles.heroCopy}>
        <p className={styles.eyebrow}>{t("eyebrow")}</p>
        {title && (
          <h1 id="luxe-title" className={styles.heroTitle}>
            {words.slice(0, -1).join(" ")}
            <em>{words.at(-1)}</em>
          </h1>
        )}
        <div className={styles.heroBottom}>
          {subtitle && <p>{subtitle}</p>}
          {nextSection && (
            <a href={`#${nextSection}`} className={styles.textLink}>
              {t("explore")}
              <ArrowRightIcon className="size-5 rtl:rotate-180" />
            </a>
          )}
        </div>
      </div>
      {poster && (
        <div className={styles.heroVisual}>
          <div className={styles.heroImage}>
            <Image
              src={poster}
              alt=""
              fill
              unoptimized
              priority
              sizes="(max-width: 767px) 224px, 320px"
              className={styles.cover}
            />
          </div>
          <span className={styles.imageSeal} aria-hidden="true">
            L<span>W</span>
          </span>
          {hasVideo && (
            <a href="#luxe-film" className={styles.filmLink}>
              {t("watchFilm")}
              <ArrowDownIcon className="size-4" />
            </a>
          )}
        </div>
      )}
      <div className={styles.heroFoot}>
        <span>{t("heroFoot")}</span>
        {brand && <span>{brand}</span>}
      </div>
    </section>
  );
}
