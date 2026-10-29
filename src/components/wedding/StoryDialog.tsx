"use client";
import Image from "next/image";
import { useTranslations } from "next-intl";
import CrewDialog from "@/components/crew/CrewDialog";
import type { WeddingTestimonial } from "@/lib/wedding/content";

interface StoryDialogProps {
  story: WeddingTestimonial;
  preview: boolean;
  onClose: () => void;
}
export default function StoryDialog({
  story,
  preview,
  onClose,
}: StoryDialogProps) {
  const t = useTranslations("wedding");
  const source =
    story.photo_url ||
    (story.photo_media_id
      ? `/api/wedding/media/${story.photo_media_id}`
      : null);
  return (
    <CrewDialog
      title={t("storyDetail", { name: story.couple_name })}
      onClose={onClose}
    >
      {source && (
        <div className="relative mb-5 aspect-video overflow-hidden rounded-xl">
          <Image
            src={source}
            alt={t("storyPortrait", { name: story.couple_name })}
            fill
            unoptimized
            sizes="90vw"
            className="object-cover"
          />
        </div>
      )}
      <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
        {story.venue}
      </p>
      <blockquote className="text-base leading-7 whitespace-pre-line text-gray-800 dark:text-gray-100">
        {story.full_review || story.excerpt}
      </blockquote>
      {story.video_media_id && (
        <video
          controls
          playsInline
          preload="none"
          src={`/api/wedding/media/${story.video_media_id}`}
          aria-label={t("storyVideo", { name: story.couple_name })}
          className="mt-5 max-h-80 w-full rounded-xl"
        />
      )}
      {preview && (
        <p className="mt-5 text-xs leading-5 text-gray-500 dark:text-gray-400">
          {t("storiesDemoCredit")}
        </p>
      )}
    </CrewDialog>
  );
}
