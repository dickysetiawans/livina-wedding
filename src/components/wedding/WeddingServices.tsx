"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRightIcon } from "@/icons";
import type { WeddingService } from "@/lib/wedding/content";
import styles from "./Wedding.module.css";

interface WeddingServicesProps {
  services: WeddingService[];
}
export default function WeddingServices({ services }: WeddingServicesProps) {
  const t = useTranslations("wedding");
  const [active, setActive] = useState<string | null>(null);
  const rows = services;
  return (
    <section
      id="services"
      className={styles.services}
      aria-labelledby="services-heading"
    >
      <div className={styles.serviceInner}>
        <h2 data-reveal id="services-heading" className={styles.sectionTitle}>
          {t("servicesLine1")}
          <br />
          {t("servicesLine2")}
        </h2>
        <div className={styles.accordion}>
          {rows.map((row, index) => (
            <article key={row.id} data-reveal className={styles.serviceRow}>
              <h3>
                <button
                  type="button"
                  aria-expanded={active === row.id}
                  aria-controls={`service-panel-${index}`}
                  id={`service-button-${index}`}
                  onClick={() =>
                    setActive((current) => (current === row.id ? null : row.id))
                  }
                  className={styles.serviceButton}
                >
                  <span>{row.title}</span>
                  <ArrowRightIcon
                    className={`size-5 fill-current transition-transform rtl:rotate-180 ${active === row.id ? "rotate-90" : ""}`}
                  />
                </button>
              </h3>
              <div
                id={`service-panel-${index}`}
                role="region"
                aria-labelledby={`service-button-${index}`}
                hidden={active !== row.id}
                className={styles.servicePanel}
              >
                <p>{row.description}</p>
                {row.highlight && (
                  <p className={styles.serviceHighlight}>{row.highlight}</p>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
