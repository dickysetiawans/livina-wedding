"use client";
import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ArrowRightIcon, CloseIcon, HorizontaLDots } from "@/icons";
import styles from "./Luxe.module.css";

export default function LuxeHeader({
  brand,
  logo,
  sections,
}: {
  brand: string;
  logo?: string | null;
  sections: string[];
}) {
  const t = useTranslations("luxe");
  const [open, setOpen] = useState(false);
  return (
    <header className={styles.header}>
      <a href="#top" className={styles.logo} aria-label={brand}>
        {logo && (
          <Image
            src={`/api/wedding/media/${logo}`}
            alt=""
            width={40}
            height={40}
            unoptimized
            className="me-2 inline-block object-contain"
          />
        )}
        {brand}
        <span aria-hidden="true">•</span>
      </a>
      {sections.length > 0 && (
        <button
          type="button"
          className={styles.menuButton}
          aria-label={t(open ? "closeMenu" : "openMenu")}
          aria-expanded={open}
          aria-controls="luxe-navigation"
          onClick={() => setOpen(!open)}
        >
          {open ? <CloseIcon /> : <HorizontaLDots />}
        </button>
      )}
      <nav
        id="luxe-navigation"
        aria-label={t("navigation")}
        data-open={open}
        className={styles.navigation}
      >
        {sections
          .filter((id) => id !== "contact")
          .map((id) => (
            <a key={id} href={`#${id}`} onClick={() => setOpen(false)}>
              {t(`nav.${id}`)}
            </a>
          ))}
        {sections.includes("contact") && (
          <a
            href="#contact"
            className={styles.navContact}
            onClick={() => setOpen(false)}
          >
            {t("nav.contact")}
            <ArrowRightIcon className="size-4 rtl:rotate-180" />
          </a>
        )}
      </nav>
    </header>
  );
}
