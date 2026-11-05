"use client";
import { useTranslations } from "next-intl";
import type { WeddingCrewProfile } from "@/lib/wedding/crew";
import useCrewFilter from "@/hooks/useCrewFilter";
import StoryEventFilter from "@/components/wedding/StoryEventFilter";
import LuxePortrait from "./LuxePortrait";
import styles from "./Luxe.module.css";
export default function LuxeCrew({
  members,
  preview = false,
}: {
  members: WeddingCrewProfile[];
  preview?: boolean;
}) {
  const t = useTranslations("wedding"),
    l = useTranslations("luxe"),
    filter = useCrewFilter(members);
  if (!members.some((member) => !member.is_founder)) return null;
  return (
    <section
      id="crew"
      className={styles.crew}
      aria-labelledby="luxe-crew-title"
    >
      <header data-luxe-reveal className={styles.sectionHeading}>
        <span className={styles.eyebrow}>{l("crewEyebrow")}</span>
        <h2 id="luxe-crew-title">
          {l("crewLine1")} <em>{l("crewLine2")}</em>
        </h2>
      </header>
      <StoryEventFilter
        kind="positions"
        events={filter.positions}
        active={filter.active}
        onChange={filter.select}
        tone="light"
        controls="luxe-crew-results"
        count={filter.members.length}
      />
      <div
        key={filter.active ?? "all"}
        id="luxe-crew-results"
        className={styles.memberGrid}
      >
        {filter.members.map((member) => (
          <article key={member.id} data-luxe-reveal className={styles.member}>
            <button
              type="button"
              className={styles.memberPhotoButton}
              aria-label={member.name}
            >
              <LuxePortrait member={member} />
            </button>
            {filter.active === null && (
              <span className={styles.positionBadge}>{member.role_title}</span>
            )}
            <h3>{member.name}</h3>
            <p>{member.biography}</p>
          </article>
        ))}
      </div>
      {preview && <p className={styles.credit}>{t("crewPreview")}</p>}
    </section>
  );
}
