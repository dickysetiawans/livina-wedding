import { getTranslations } from "next-intl/server";
import type { PublicCrewMember } from "@/lib/crew/types";
import PublicCrewPortrait from "./PublicCrewPortrait";
import CrewRetry from "./CrewRetry";

interface CrewSectionProps {
  members: PublicCrewMember[];
  failed?: boolean;
}
export default async function CrewSection({
  members,
  failed = false,
}: CrewSectionProps) {
  const t = await getTranslations("crew");
  return (
    <section
      id="the-crew"
      aria-labelledby="crew-heading"
      className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 sm:py-24"
    >
      <header className="mb-12 max-w-2xl space-y-5 sm:mb-16">
        <p className="text-xs font-medium tracking-widest text-gray-500 uppercase dark:text-gray-400">
          {t("publicEyebrow")}
        </p>
        <h1
          id="crew-heading"
          className="font-editorial text-title-lg leading-tight text-gray-900 sm:text-title-2xl dark:text-gray-100"
        >
          {t("title")}
        </h1>
        <p className="max-w-lg text-base leading-relaxed text-gray-600 dark:text-gray-400">
          {t("publicDescription")}
        </p>
      </header>
      {failed ? (
        <div className="space-y-4 border-t border-gray-200 py-12 dark:border-gray-800">
          <p className="text-gray-600 dark:text-gray-400">{t("publicError")}</p>
          <CrewRetry />
        </div>
      ) : !members.length ? (
        <p className="border-t border-gray-200 py-12 text-gray-500 dark:border-gray-800 dark:text-gray-400">
          {t("publicEmpty")}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-x-12 gap-y-16 md:grid-cols-2">
          {members.map((member) => (
            <article key={member.id} className="group min-w-0 space-y-5">
              <PublicCrewPortrait
                id={member.photo_media_id}
                name={member.name}
              />
              <div className="space-y-3">
                <p className="text-xs font-medium tracking-widest break-words text-gray-500 uppercase dark:text-gray-400">
                  {member.role_title}
                </p>
                <h2 className="font-editorial text-title-sm break-words text-gray-900 dark:text-gray-100">
                  {member.name}
                </h2>
                <p className="text-base leading-relaxed break-words whitespace-pre-line text-gray-600 dark:text-gray-300">
                  {member.biography}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
