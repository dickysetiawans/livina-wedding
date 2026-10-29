"use client";

import { useEffect } from "react";
import styles from "./Wedding.module.css";

export default function WeddingMotion() {
  useEffect(() => {
    const root = document.getElementById("livina-website");
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.revealed);
            observer.unobserve(entry.target);
          }
        }),
      { threshold: 0.12 },
    );
    root.querySelectorAll<HTMLElement>("[data-reveal]").forEach((node) => {
      node.classList.add(styles.willReveal);
      observer.observe(node);
    });
    let frame = 0;
    const update = () => {
      const film = document.getElementById("livina-film");
      if (film) {
        const bounds = film.getBoundingClientRect();
        const progress = Math.min(
          1,
          Math.max(0, -bounds.top / (window.innerHeight * 0.8)),
        );
        film.style.setProperty("--film-progress", String(progress));
      }
      const galleryBounds = document
        .getElementById("stories")
        ?.getBoundingClientRect();
      const expansion = galleryBounds
        ? Math.max(
            0,
            Math.min(
              1,
              (window.innerHeight - galleryBounds.top) /
                (galleryBounds.height * 0.8),
            ),
          )
        : 1;
      const scales = [0.75, 0.42, 1, 0.68, 0.85, 0.95];
      root
        .querySelectorAll<HTMLElement>("[data-parallax]")
        .forEach((node, index) => {
          const box = node.getBoundingClientRect();
          const offset = Math.max(
            -1,
            Math.min(
              1,
              (box.top - window.innerHeight / 2) / window.innerHeight,
            ),
          );
          node.style.setProperty(
            "--drift",
            `${offset * Number(node.dataset.parallax || 0)}px`,
          );
          const initial = scales[index % scales.length];
          node.style.setProperty(
            "--card-scale",
            String(initial + (1 - initial) * expansion),
          );
        });
      frame = 0;
    };
    const scroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const cursor = root.querySelector<HTMLElement>("[data-cursor]");
    const pointer = (event: PointerEvent) => {
      if (!cursor || event.pointerType === "touch") return;
      if ((event.target as HTMLElement).closest("#crew")) {
        cursor.style.opacity = "0";
        return;
      }
      cursor.style.transform = `translate3d(${event.clientX}px,${event.clientY}px,0)`;
      cursor.style.opacity = "1";
      cursor.classList.toggle(
        styles.cursorLink,
        Boolean((event.target as HTMLElement).closest("a,button,summary")),
      );
    };
    const leave = () => {
      if (cursor) cursor.style.opacity = "0";
    };
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("resize", scroll);
    root.addEventListener("pointermove", pointer);
    root.addEventListener("pointerleave", leave);
    update();
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", scroll);
      window.removeEventListener("resize", scroll);
      root.removeEventListener("pointermove", pointer);
      root.removeEventListener("pointerleave", leave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
  return <span aria-hidden="true" data-cursor className={styles.cursor} />;
}
