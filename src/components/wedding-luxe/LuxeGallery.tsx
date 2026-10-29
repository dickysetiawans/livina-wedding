"use client";
import Image from "next/image";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useModal } from "@/hooks/useModal";
import StoryDialog from "@/components/wedding/StoryDialog";
import type { WeddingTestimonial } from "@/lib/wedding/content";
import styles from "./Luxe.module.css";

interface LuxeGalleryProps {
  testimonials: WeddingTestimonial[];
  preview?: boolean;
}
export default function LuxeGallery({
  testimonials,
  preview = false,
}: LuxeGalleryProps) {
  const t = useTranslations("wedding");
  const l = useTranslations("luxe");
  const modal = useModal();
  const [selected, setSelected] = useState<WeddingTestimonial | null>(null);
  return (
    <section
      id="stories"
      className={styles.stories}
      aria-labelledby="luxe-stories-title"
    >
      <header data-luxe-reveal className={styles.sectionHeading}>
        <span className={styles.eyebrow}>{l("storiesEyebrow")}</span>
        <h2 id="luxe-stories-title">{t("storiesTitle")}</h2>
        <p>{t("storiesSubtitle")}</p>
      </header>
      <div className={styles.gallery}>
        {testimonials.map((review) => {
          const photo =
            review.photo_url ||
            (review.photo_media_id
              ? `/api/wedding/media/${review.photo_media_id}`
              : null);
          return (
            <article key={review.id} data-luxe-reveal className={styles.review}>
              <button
                type="button"
                className={styles.galleryPhotoButton}
                aria-label={t("readStory", { name: review.couple_name })}
                onClick={() => {
                  setSelected(review);
                  modal.openModal();
                }}
              >
                <span className={styles.galleryImage}>
                  {photo && (
                    <Image
                      src={photo}
                      alt={t("storyPortrait", { name: review.couple_name })}
                      fill
                      unoptimized
                      sizes="(max-width:767px) 224px,288px"
                      className={styles.cover}
                    />
                  )}
                </span>
              </button>
              <h3>{review.couple_name}</h3>
              <span className={styles.eyebrow}>{review.venue}</span>
              <blockquote>{review.excerpt}</blockquote>
              <button
                type="button"
                className={styles.storyReadLink}
                onClick={() => {
                  setSelected(review);
                  modal.openModal();
                }}
              >
                {l("viewStory")}
              </button>
            </article>
          );
        })}
      </div>
      {!testimonials.length && (
        <p className={styles.credit}>{t("storiesEmpty")}</p>
      )}
      {preview && <p className={styles.credit}>{t("storiesDemoCredit")}</p>}
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
