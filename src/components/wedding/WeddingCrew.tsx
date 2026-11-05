"use client";
import Image from "next/image";
import { useTranslations } from "next-intl";
import type { WeddingCrewProfile } from "@/lib/wedding/crew";
import useCrewFilter from "@/hooks/useCrewFilter";
import StoryEventFilter from "./StoryEventFilter";
import styles from "./Wedding.module.css";
export default function WeddingCrew({
  members,
  preview = false,
}: {
  members: WeddingCrewProfile[];
  preview?: boolean;
}) {
  const t = useTranslations("wedding"),
    filter = useCrewFilter(members);
  if (!members.some((member) => !member.is_founder)) return null;
  return (
    <section id="crew" aria-labelledby="crew-title" className={styles.crew}>
      <h2 id="crew-title" data-reveal className={styles.crewGroupTitle}>
        {t("crewGroup")}
      </h2>
      <StoryEventFilter
        kind="positions"
        events={filter.positions}
        active={filter.active}
        onChange={filter.select}
        tone="dark"
        controls="crew-results"
        count={filter.members.length}
      />
      <div
        key={filter.active ?? "all"}
        id="crew-results"
        className={styles.crewCardGrid}
      >
        {filter.members.map((member) => {
          const photo =
            member.photo_url ||
            (member.photo_media_id
              ? `/api/crew/photo/${member.photo_media_id}`
              : null);
          return (
            <article key={member.id} data-reveal className={styles.crewCard}>
              <button
                type="button"
                className={styles.crewCardPhoto}
                aria-label={member.name}
              >
                {photo ? (
                  <Image
                    src={photo}
                    alt={member.name}
                    fill
                    unoptimized
                    sizes="(max-width:767px) 90vw,(max-width:1023px) 45vw,30vw"
                    className={styles.cover}
                  />
                ) : (
                  <span className={styles.ownerInitial}>
                    {member.name.slice(0, 1)}
                  </span>
                )}
              </button>
              <div className={styles.crewCardCopy}>
                {filter.active === null && (
                  <span className={styles.positionBadge}>
                    {member.role_title}
                  </span>
                )}
                <h3>{member.name}</h3>
                <p>{member.biography}</p>
              </div>
            </article>
          );
        })}
      </div>
      {preview && <p className={styles.crewPreview}>{t("crewPreview")}</p>}
    </section>
  );
}
