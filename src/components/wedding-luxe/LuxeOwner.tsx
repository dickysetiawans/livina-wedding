import { withoutOwnerLabel } from "@/lib/wedding/package-inquiry";
import { getTranslations } from "next-intl/server";
import type { WeddingCrewProfile } from "@/lib/wedding/crew";
import LuxePortrait from "./LuxePortrait";
import styles from "./Luxe.module.css";
export default async function LuxeOwner({
  member,
}: {
  member: WeddingCrewProfile;
}) {
  const t = await getTranslations("wedding");
  return (
    <section
      id="owner"
      className={styles.owner}
      aria-labelledby="luxe-owner-title"
    >
      <header data-luxe-reveal className={styles.sectionHeading}>
        <h2 id="luxe-owner-title">{t("ownerGroup")}</h2>
      </header>
      <article data-luxe-reveal className={styles.founder}>
        <LuxePortrait member={member} />
        <div className={styles.founderCopy}>
          <span className={styles.eyebrow}>
            {withoutOwnerLabel(member.role_title)}
          </span>
          <h3>{member.name}</h3>
          <span className={styles.smallRule} />
          <p>{withoutOwnerLabel(member.biography)}</p>
          <span className={styles.signature}>{member.name}</span>
        </div>
      </article>
    </section>
  );
}
