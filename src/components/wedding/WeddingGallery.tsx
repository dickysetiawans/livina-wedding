"use client";
import Image from "next/image";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useModal } from "@/hooks/useModal";
import type { WeddingTestimonial } from "@/lib/wedding/content";
import StoryDialog from "./StoryDialog";
import styles from "./Wedding.module.css";

interface WeddingGalleryProps {
  testimonials: WeddingTestimonial[];
  preview?: boolean;
}
export default function WeddingGallery({
  testimonials,
  preview = false,
}: WeddingGalleryProps) {
  const t = useTranslations("wedding");
  const modal = useModal();
  const [selected, setSelected] = useState<WeddingTestimonial | null>(null);
  return (
    <section
      id="stories"
      className={styles.stories}
      aria-labelledby="stories-heading"
    >
      <header data-reveal className={styles.storiesHeader}>
        <h2 id="stories-heading" className={styles.sectionTitle}>
          {t("storiesTitle")}
        </h2>
        <p>{t("storiesSubtitle")}</p>
      </header>
      <div className={styles.storyGrid}>
        {testimonials.map((review, index) => {
          const photo =
            review.photo_url ||
            (review.photo_media_id
              ? `/api/wedding/media/${review.photo_media_id}`
              : null);
          return (
            <article
              key={review.id}
              data-reveal
              data-parallax={index % 2 ? "-45" : "50"}
              className={styles.storyCard}
            >
              {photo && (
                <Image
                  src={photo}
                  alt={t("storyPortrait", { name: review.couple_name })}
                  fill
                  unoptimized
                  sizes="(max-width:640px) 90vw,33vw"
                  className={styles.cover}
                />
              )}
              <div className={styles.storyOverlay}>
                <h3>{review.couple_name}</h3>
                <p>{review.venue}</p>
                <blockquote>{review.excerpt}</blockquote>
              </div>
              <button
                type="button"
                className={styles.storyOpen}
                aria-label={t("readStory", { name: review.couple_name })}
                onClick={() => {
                  setSelected(review);
                  modal.openModal();
                }}
              />
            </article>
          );
        })}
      </div>
      {!testimonials.length && (
        <p className={styles.referenceCredit}>{t("storiesEmpty")}</p>
      )}
      {preview && (
        <p className={styles.referenceCredit}>{t("storiesDemoCredit")}</p>
      )}
      {modal.isOpen && selected && (
        <StoryDialog
          story={selected}
          preview={preview}
          onClose={modal.closeModal}
        />
      )}
    </section>
  );
}
