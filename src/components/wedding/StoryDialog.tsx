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
      {!!story.crew_assignments?.length && (
        <section className="mt-7 border-t border-gray-200 pt-6 dark:border-gray-700">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            {t("eventCrew")}
          </h3>
          <div className="grid gap-5 sm:grid-cols-2">
            {story.crew_assignments.map((member) => (
              <article
                key={member.id}
                className="rounded-xl border border-gray-200 p-4 dark:border-gray-700"
              >
                {member.photo_media_id && (
                  <div className="relative mb-3 aspect-4/5 max-w-48 overflow-hidden rounded-lg">
                    <Image
                      src={`/api/wedding/media/${member.photo_media_id}`}
                      alt={member.name}
                      fill
                      unoptimized
                      sizes="192px"
                      className="object-cover"
                    />
                  </div>
                )}
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  {member.name}
                </h4>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {member.position_name}
                </p>
                {member.video_media_id && (
                  <video
                    controls
                    playsInline
                    preload="none"
                    src={`/api/wedding/media/${member.video_media_id}`}
                    aria-label={t("eventCrewVideo", { name: member.name })}
                    className="mt-3 w-full rounded-lg"
                  />
                )}
              </article>
            ))}
          </div>
        </section>
      )}
      {preview && (
        <p className="mt-5 text-xs leading-5 text-gray-500 dark:text-gray-400">
          {t("storiesDemoCredit")}
        </p>
      )}
    </CrewDialog>
  );
}
