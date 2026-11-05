"use client";
import { useTranslations } from "next-intl";
import styles from "./StoryEventFilter.module.css";
export default function StoryMoreButton({
  show,
  onClick,
  controls,
}: {
  show: boolean;
  onClick: () => void;
  controls: string;
}) {
  const t = useTranslations("wedding");
  return show ? (
    <div className={styles.more}>
      <button
        type="button"
        aria-controls={controls}
        onClick={onClick}
        className={styles.button}
      >
        {t("storiesShowMore")}
      </button>
    </div>
  ) : null;
}
