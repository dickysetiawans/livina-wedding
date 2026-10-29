"use client";
import { useEffect, useRef } from "react";
import styles from "./Luxe.module.css";

export default function LuxeMotion() {
  const progress = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const root = document.getElementById("livina-luxe");
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.visible);
            observer.unobserve(entry.target);
          }
        }),
      { threshold: 0.08 },
    );
    root
      .querySelectorAll<HTMLElement>("[data-luxe-reveal]")
      .forEach((node, index) => {
        node.style.setProperty(
          "--reveal-delay",
          `${Math.min(index % 3, 2) * 90}ms`,
        );
        node.classList.add(styles.reveal);
        observer.observe(node);
      });
    let frame = 0;
    const update = () => {
      const distance =
        document.documentElement.scrollHeight - window.innerHeight;
      const ratio = distance > 0 ? window.scrollY / distance : 0;
      if (progress.current)
        progress.current.style.transform = `scaleX(${Math.min(1, Math.max(0, ratio))})`;
      frame = 0;
    };
    const scroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("resize", scroll);
    update();
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", scroll);
      window.removeEventListener("resize", scroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
  return <span ref={progress} aria-hidden="true" className={styles.progress} />;
}
