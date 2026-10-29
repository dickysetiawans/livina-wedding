"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRightIcon } from "@/icons";
import type { WeddingService } from "@/lib/wedding/content";
import styles from "./Luxe.module.css";

export default function LuxeServices({
  services,
}: {
  services: WeddingService[];
}) {
  const t = useTranslations("wedding");
  const l = useTranslations("luxe");
  const rows = services;
  const [active, setActive] = useState(0);
  const current = rows[active] || rows[0];
  if (!current)
    return (
      <section id="services" className={styles.services}>
        <h2>
          {t("servicesLine1")} {t("servicesLine2")}
        </h2>
      </section>
    );
  return (
    <section
      id="services"
      className={styles.services}
      aria-labelledby="luxe-services-title"
    >
      <header data-luxe-reveal className={styles.sectionHeading}>
        <span className={styles.eyebrow}>{l("servicesEyebrow")}</span>
        <h2 id="luxe-services-title">
          {t("servicesLine1")} <em>{t("servicesLine2")}</em>
        </h2>
      </header>
      <div className={styles.servicesLayout}>
        <div data-luxe-reveal className={styles.serviceList}>
          {rows.map((row, index) => (
            <button
              key={row.id}
              type="button"
              id={`luxe-service-${index}`}
              aria-pressed={active === index}
              aria-controls="luxe-service-detail"
              onClick={() => setActive(index)}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              {row.title}
              <ArrowRightIcon className="size-5 rtl:rotate-180" />
            </button>
          ))}
        </div>
        <article
          data-luxe-reveal
          className={styles.serviceDetail}
          id="luxe-service-detail"
          aria-labelledby={`luxe-service-${active}`}
          aria-live="polite"
        >
          <div key={current.id} className={styles.detailContent}>
            <span className={styles.detailNumber} aria-hidden="true">
              {String(active + 1).padStart(2, "0")}
            </span>
            <h3>{current.title}</h3>
            <p>{current.description}</p>
            {current.highlight && (
              <p className={styles.serviceHighlight}>{current.highlight}</p>
            )}
            <a href="#contact" className={styles.textLink}>
              {l("nav.contact")}
              <ArrowRightIcon className="size-5 rtl:rotate-180" />
            </a>
          </div>
        </article>
      </div>
    </section>
  );
}
