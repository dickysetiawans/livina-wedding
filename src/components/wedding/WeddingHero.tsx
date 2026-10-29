"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { ChevronDownIcon } from "@/icons";
import styles from "./Wedding.module.css";

interface WeddingHeroProps {
  filmTitle?: string;
  title: string;
  subtitle: string;
  video: string;
  poster: string;
  nextSection?: string;
}
export default function WeddingHero({
  filmTitle,
  title,
  subtitle,
  video,
  poster,
  nextSection,
}: WeddingHeroProps) {
  const t = useTranslations("wedding");
  const [videoFailed, setVideoFailed] = useState(false);
  const player = useRef<HTMLVideoElement>(null);
  const [manualPlay, setManualPlay] = useState(false);
  useEffect(() => {
    const node = player.current;
    if (!node || videoFailed) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      node.autoplay = false;
      node.controls = true;
      node.pause();
      return;
    }
    node.loop = true;
    node.muted = true;
    // A browser autoplay restriction is not a broken media file. Keep the
    // video mounted with controls so a user gesture can start the loop.
    let active = true;
    void node.play().catch(() => {
      if (active) setManualPlay(true);
    });
    return () => {
      active = false;
      node.pause();
    };
  }, [videoFailed, video]);
  return (
    <>
      {(title || subtitle) && (
        <section
          className={styles.hero}
          aria-labelledby={title ? "wedding-title" : undefined}
        >
          <div className={styles.heroCaption}>
            {title && (
              <h1
                id="wedding-title"
                className={styles.heroTitle}
                aria-label={title}
              >
                {title.split(" ").map((word, index) => (
                  <span
                    className={styles.heroWord}
                    key={`${word}-${index}`}
                    aria-hidden="true"
                  >
                    {word.split("").map((letter, n) => (
                      <span
                        key={n}
                        style={{
                          animationDelay: `${0.15 + index * 0.25 + n * 0.045}s`,
                        }}
                      >
                        {letter}
                      </span>
                    ))}
                  </span>
                ))}
              </h1>
            )}
            {subtitle && <p className={styles.heroTagline}>{subtitle}</p>}
          </div>
          {(video || poster || nextSection) && (
            <a
              href={video || poster ? "#livina-film" : `#${nextSection}`}
              className={styles.scrollHint}
              aria-label={t("scroll")}
            >
              <ChevronDownIcon className="size-7" />
            </a>
          )}
        </section>
      )}
      {(video || poster) && (
        <section
          id="livina-film"
          className={styles.film}
          aria-label={t("film")}
        >
          <div className={styles.filmSticky}>
            {filmTitle && <h2 className={styles.filmTitle}>{filmTitle}</h2>}
            <div className={styles.filmMask}>
              {(!video || videoFailed) && poster ? (
                <Image
                  src={poster}
                  alt=""
                  fill
                  sizes="100vw"
                  unoptimized
                  className={styles.filmMedia}
                />
              ) : video && !videoFailed ? (
                <video
                  ref={player}
                  className={styles.filmMedia}
                  autoPlay
                  controls={manualPlay}
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  poster={poster || undefined}
                  onError={() => setVideoFailed(true)}
                  aria-label={t("film")}
                >
                  <source src={video} type="video/mp4" />
                </video>
              ) : null}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
