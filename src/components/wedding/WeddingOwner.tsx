import { withoutOwnerLabel } from "@/lib/wedding/package-inquiry";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import type { WeddingCrewProfile } from "@/lib/wedding/crew";
import styles from "./Wedding.module.css";
export default async function WeddingOwner({
  member,
}: {
  member: WeddingCrewProfile;
}) {
  const t = await getTranslations("wedding");
  const photo =
    member.photo_url ||
    (member.photo_media_id ? `/api/crew/photo/${member.photo_media_id}` : null);
  return (
    <section id="owner" className={styles.owner} aria-labelledby="owner-title">
      <h2 id="owner-title" data-reveal className={styles.crewGroupTitle}>
        {t("ownerGroup")}
      </h2>
      <div className={styles.ownerLayout}>
        <div data-reveal className={styles.ownerPortrait}>
          {photo ? (
            <Image
              src={photo}
              alt={member.name}
              fill
              unoptimized
              sizes="(max-width:767px) 90vw, 420px"
              className={styles.cover}
            />
          ) : (
            <span className={styles.ownerInitial}>
              {member.name.slice(0, 1)}
            </span>
          )}
        </div>
        <div data-reveal className={styles.ownerCopy}>
          <p className={styles.ownerRole}>
            {withoutOwnerLabel(member.role_title)}
          </p>
          <h3>{member.name}</h3>
          <p className={styles.ownerBio}>
            {withoutOwnerLabel(member.biography)}
          </p>
        </div>
      </div>
    </section>
  );
}
