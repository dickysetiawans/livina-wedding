"use client";

import { useTranslations } from "next-intl";
import type { WeddingCrewProfile } from "@/lib/wedding/crew";
import WeddingCrewRow from "./WeddingCrewRow";
import styles from "./Wedding.module.css";

interface WeddingCrewProps {
  members: WeddingCrewProfile[];
  preview?: boolean;
}
export default function WeddingCrew({
  members,
  preview = false,
}: WeddingCrewProps) {
  const t = useTranslations("wedding");
  const ordered = [...members].sort(
    (a, b) =>
      Number(b.is_founder) - Number(a.is_founder) ||
      a.sort_order - b.sort_order,
  );
  const founder = ordered.find((member) => member.is_founder);
  const rest = ordered.filter((member) => member.id !== founder?.id);
  return (
    <section id="crew" aria-label={t("crew")} className={styles.crew}>
      {ordered.length ? (
        <>
          {founder && (
            <>
              <h2 data-reveal className={styles.crewGroupTitle}>
                {t("ownerGroup")}
              </h2>
              <WeddingCrewRow key={founder.id} member={founder} />
            </>
          )}
          {rest.length > 0 && (
            <>
              <h2 data-reveal className={styles.crewGroupTitle}>
                {t("crewGroup")}
              </h2>
              {rest.map((member) => (
                <WeddingCrewRow key={member.id} member={member} />
              ))}
            </>
          )}
        </>
      ) : (
        <article data-reveal className={styles.crewRow}>
          <p className={styles.crewRole}>{t("crewRole")}</p>
          <h2 className={styles.crewName}>{t("crew")}</h2>
          <p className={styles.crewBio}>{t("crewEmpty")}</p>
        </article>
      )}
      {preview && <p className={styles.crewPreview}>{t("crewPreview")}</p>}
    </section>
  );
}
