"use client";
import PackageInquiry from "./PackageInquiry";
import { shortPrice } from "@/lib/wedding/package-inquiry";
import type { WeddingContent } from "@/lib/wedding/content";
import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { packageSelection, type PackageCatalog } from "@/lib/wedding/packages";
import styles from "./PackageShowcase.module.css";
interface Props {
  catalog: PackageCatalog;
  tone: "dark" | "light";
  settings?: WeddingContent["settings"];
}
export default function PackageShowcase({
  catalog,
  tone,
  settings = null,
}: Props) {
  const t = useTranslations("weddingPackages");
  const [state, setState] = useState<{
    category: string | null;
    subcategory: string | null;
    kind: string;
    limit: number;
  }>({ category: null, subcategory: null, kind: "all_in", limit: 4 });
  const selected = packageSelection(
    catalog,
    state.category,
    state.subcategory,
    state.kind,
  );
  if (!selected.category) return null;
  const limit =
    state.category === selected.category.id &&
    state.subcategory === (selected.subcategory?.id ?? null) &&
    state.kind === selected.kind
      ? state.limit
      : 4;
  const key = `${selected.category.id}:${selected.subcategory?.id || ""}:${selected.kind}`;
  const visible = selected.packages.slice(0, limit);
  const label =
    selected.category.name +
    (selected.subcategory ? ` / ${selected.subcategory.name}` : "");
  const kindLabel = (kind: string) =>
    t(kind === "all_in" ? "allIn" : "nonVenue");
  const pdfUrl = "/api/wedding/packages/pdf";
  return (
    <section
      id="packages"
      data-tone={tone}
      className={styles.section}
      aria-labelledby="packages-title"
    >
      <header className={styles.heading}>
        <p>{t("eyebrow")}</p>
        <h2 id="packages-title">{t("title")}</h2>
        <p>{t("intro")}</p>
      </header>
      <div className={styles.filterBar}>
        <div role="group" aria-label={t("categories")} className={styles.tabs}>
          {selected.categories.map((category) => (
            <button
              type="button"
              key={category.id}
              aria-pressed={category.id === selected.category?.id}
              aria-controls="package-results package-gallery"
              onClick={() =>
                setState({
                  category: category.id,
                  subcategory: null,
                  kind: "all_in",
                  limit: 4,
                })
              }
            >
              {category.name}
            </button>
          ))}
        </div>
        {catalog.packages.length > 0 && (
          <a className={styles.download} href={pdfUrl} download>
            {t("generatePdf")}
          </a>
        )}
      </div>
      {selected.subcategories.length > 0 && (
        <div
          role="group"
          aria-label={t("subcategories")}
          className={styles.subtabs}
        >
          {selected.subcategories.map((subcategory) => (
            <button
              type="button"
              key={subcategory.id}
              aria-pressed={subcategory.id === selected.subcategory?.id}
              aria-controls="package-results package-gallery"
              onClick={() =>
                setState({
                  category: selected.category!.id,
                  subcategory: subcategory.id,
                  kind: "all_in",
                  limit: 4,
                })
              }
            >
              {subcategory.name}
            </button>
          ))}
        </div>
      )}
      {selected.kinds.length > 0 && (
        <div role="group" aria-label={t("kinds")} className={styles.kinds}>
          {selected.kinds.map((kind) => (
            <button
              type="button"
              key={kind}
              aria-pressed={selected.kind === kind}
              aria-controls="package-results"
              onClick={() =>
                setState({
                  category: selected.category!.id,
                  subcategory: selected.subcategory?.id ?? null,
                  kind,
                  limit: 4,
                })
              }
            >
              {kindLabel(kind)}
            </button>
          ))}
        </div>
      )}
      <p className="sr-only" role="status" aria-live="polite">
        {t("results", {
          category: label,
          kind: kindLabel(selected.kind),
          count: visible.length,
          total: selected.packages.length,
        })}
      </p>
      <div id="package-results" className={styles.prices} key={key}>
        {visible.map((item) => (
          <article key={item.id} className={styles.card}>
            <p className={styles.type}>{kindLabel(item.package_kind)}</p>
            <h3>{item.name}</h3>
            <p className={styles.price}>{shortPrice(item.price)}</p>
            <p className={styles.benefitTitle}>{t("benefits")}</p>
            <ul>
              {item.benefits.map((benefit, index) => (
                <li key={index}>{benefit}</li>
              ))}
            </ul>
            <PackageInquiry item={item} catalog={catalog} settings={settings} />
          </article>
        ))}
      </div>
      {selected.packages.length > limit && (
        <div className={styles.more}>
          <button
            type="button"
            aria-controls="package-results"
            onClick={() =>
              setState({
                category: selected.category!.id,
                subcategory: selected.subcategory?.id ?? null,
                kind: selected.kind,
                limit: limit + 4,
              })
            }
          >
            {t("showMore")}
          </button>
        </div>
      )}
      {selected.gallery.length > 0 && (
        <div id="package-gallery" className={styles.gallerySection}>
          <h3>{label}</h3>
          <div
            className={styles.gallery}
            key={selected.category.id + ":" + (selected.subcategory?.id ?? "")}
          >
            {selected.gallery.map((photo) => (
              <figure key={photo.id}>
                <button
                  type="button"
                  className={styles.photo}
                  aria-label={photo.name}
                >
                  <Image
                    src={`/api/wedding/media/${photo.photo_media_id}`}
                    alt={photo.caption || photo.name}
                    fill
                    unoptimized
                    sizes="(max-width:600px) 90vw, (max-width:1000px) 45vw, 22vw"
                    className={styles.cover}
                  />
                </button>
                <figcaption>
                  <strong>{photo.name}</strong>
                  {photo.caption && <p>{photo.caption}</p>}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
