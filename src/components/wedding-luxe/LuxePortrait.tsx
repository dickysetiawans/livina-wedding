import Image from "next/image";
import type { WeddingCrewProfile } from "@/lib/wedding/crew";
import styles from "./Luxe.module.css";
export default function LuxePortrait({
  member,
}: {
  member: WeddingCrewProfile;
}) {
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
          sizes="(max-width:767px) 192px, 224px"
          className={styles.cover}
        />
      ) : (
        <span className={styles.initials}>
          {member.name
            .split(" ")
            .map((word) => word[0])
            .slice(0, 2)
            .join("")}
        </span>
      )}
    </div>
  );
}
