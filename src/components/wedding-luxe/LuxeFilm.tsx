"use client";
import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import styles from "./Luxe.module.css";

export default function LuxeFilm({
  video,
  poster,
  title,
}: {
  video: string;
  poster: string;
  title: string;
}) {
  const t = useTranslations("luxe");
  const w = useTranslations("wedding");
  const [failed, setFailed] = useState(false);
  return (
    <section id="luxe-film" className={styles.film} aria-label={w("film")}>
      <div className={styles.filmHeading} data-luxe-reveal>
        <span className={styles.eyebrow}>{t("filmEyebrow")}</span>
        <p>{title}</p>
      </div>
      <div data-luxe-reveal className={styles.filmFrame}>
        {failed && poster ? (
          <Image
            src={poster}
            alt={w("film")}
            fill
            unoptimized
            sizes="90vw"
            className={styles.cover}
          />
        ) : !failed ? (
          <video
            controls
            playsInline
            preload="none"
            poster={poster || undefined}
            aria-label={w("film")}
            onError={() => setFailed(true)}
          >
            <source src={video} type="video/mp4" />
          </video>
        ) : null}
      </div>
    </section>
  );
}
