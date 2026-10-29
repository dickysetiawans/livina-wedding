import Image from "next/image";
import { getTranslations } from "next-intl/server";
import type { WeddingCrewProfile } from "@/lib/wedding/crew";
import styles from "./Luxe.module.css";

interface LuxeCrewProps {
  members: WeddingCrewProfile[];
  preview: boolean;
}
function Portrait({ member }: { member: WeddingCrewProfile }) {
  const source =
    member.photo_url ||
    (member.photo_media_id ? `/api/crew/photo/${member.photo_media_id}` : null);
  return (
    <div className={styles.portrait}>
      {source ? (
        <Image
          src={source}
          alt={member.name}
          fill
          unoptimized
          sizes="(max-width: 767px) 192px, 224px"
          className={styles.cover}
        />
      ) : (
        <span className={styles.initials}>
          {member.name
            .split(" ")
            .map((w) => w[0])
            .slice(0, 2)
            .join("")}
        </span>
      )}
    </div>
  );
}
export default async function LuxeCrew({ members, preview }: LuxeCrewProps) {
  const t = await getTranslations("wedding");
  const l = await getTranslations("luxe");
  const ordered = [...members].sort(
    (a, b) =>
      Number(b.is_founder) - Number(a.is_founder) ||
      a.sort_order - b.sort_order,
  );
  const founder = ordered.find((member) => member.is_founder);
  const rest = ordered.filter((member) => member.id !== founder?.id);
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
      {founder && (
        <>
          <h2 data-luxe-reveal className={styles.crewGroupTitle}>
            {t("ownerGroup")}
          </h2>
          <article data-luxe-reveal className={styles.founder}>
            <Portrait member={founder} />
            <div className={styles.founderCopy}>
              <span className={styles.eyebrow}>{founder.role_title}</span>
              <h3>{founder.name}</h3>
              <span className={styles.smallRule} />
              <p>{founder.biography}</p>
              <span className={styles.signature}>{founder.name}</span>
            </div>
          </article>
        </>
      )}
      {rest.length > 0 && (
        <>
          <h2 data-luxe-reveal className={styles.crewGroupTitle}>
            {t("crewGroup")}
          </h2>
          <div className={styles.memberGrid}>
            {rest.map((member) => (
              <article
                key={member.id}
                data-luxe-reveal
                className={styles.member}
              >
                <Portrait member={member} />
                <span className={styles.eyebrow}>{member.role_title}</span>
                <h3>{member.name}</h3>
                <p>{member.biography}</p>
              </article>
            ))}
          </div>
        </>
      )}
      {!members.length && <p>{t("crewEmpty")}</p>}
      {preview && <p className={styles.credit}>{t("crewPreview")}</p>}
    </section>
  );
}
