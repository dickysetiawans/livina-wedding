"use client";

import Image from "next/image";
import { createPortal } from "react-dom";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import { useTranslations } from "next-intl";
import type { WeddingCrewProfile } from "@/lib/wedding/crew";
import styles from "./Wedding.module.css";

interface WeddingCrewRowProps {
  member: WeddingCrewProfile;
}
type PhotoMode = "pointer" | "keyboard" | "touch" | null;

export default function WeddingCrewRow({ member }: WeddingCrewRowProps) {
  const t = useTranslations("wedding");
  const [mode, setMode] = useState<PhotoMode>(null);
  const [opened, setOpened] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const floatingPhoto = useRef<HTMLSpanElement>(null);
  const point = useRef({ x: 0, y: 0 });
  const photo =
    member.photo_url ||
    (member.photo_media_id ? `/api/crew/photo/${member.photo_media_id}` : null);
  const photoId = `crew-photo-${member.id}`;

  function placePhoto() {
    const node = floatingPhoto.current;
    if (!node) return;
    const width = node.offsetWidth;
    const height = node.offsetHeight;
    const x = point.current.x - width / 2;
    const y = point.current.y - height / 2;
    node.style.setProperty("--photo-x", `${x}px`);
    node.style.setProperty("--photo-y", `${y}px`);
  }
  function show(next: Exclude<PhotoMode, null>) {
    if (!photo) return;
    if (
      next !== "pointer" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      const box = trigger.current?.getBoundingClientRect();
      point.current = {
        x: window.innerWidth / 2,
        y: box ? box.top + box.height / 2 : window.innerHeight / 2,
      };
    }
    setOpened(true);
    setMode(next);
  }
  function pointerMove(event: PointerEvent<HTMLButtonElement>) {
    if (
      event.pointerType !== "mouse" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    point.current = { x: event.clientX, y: event.clientY };
    placePhoto();
  }
  useLayoutEffect(() => {
    if (mode && mode !== "touch") placePhoto();
  }, [mode]);
  useEffect(() => {
    if (!mode) return;
    const close = () => setMode(null);
    const scroll = () => {
      if (mode === "pointer") close();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("resize", close);
    window.addEventListener("keydown", escape);
    return () => {
      window.removeEventListener("scroll", scroll);
      window.removeEventListener("resize", close);
      window.removeEventListener("keydown", escape);
    };
  }, [mode]);

  const text = (
    <>
      <span className={styles.crewRole}>{member.role_title}</span>
      <span className={styles.crewName}>{member.name}</span>
      <span className={styles.crewBio}>{member.biography}</span>
    </>
  );
  return (
    <article
      data-reveal
      data-founder={member.is_founder || undefined}
      data-active={mode !== null}
      className={styles.crewRow}
    >
      {photo ? (
        <button
          ref={trigger}
          type="button"
          className={styles.crewTrigger}
          aria-expanded={mode !== null}
          aria-controls={opened ? photoId : undefined}
          onPointerEnter={(event) => {
            if (event.pointerType === "mouse") {
              point.current = { x: event.clientX, y: event.clientY };
              show("pointer");
            }
          }}
          onPointerMove={pointerMove}
          onPointerLeave={() => {
            if (mode === "pointer") setMode(null);
          }}
          onFocus={(event) => {
            if (event.currentTarget.matches(":focus-visible")) show("keyboard");
          }}
          onBlur={() => setMode(null)}
          onClick={(event) => {
            if (
              window.matchMedia("(max-width: 767px), (hover: none)").matches
            ) {
              if (mode === "touch") setMode(null);
              else show("touch");
            } else if (event.detail === 0) {
              if (mode === "keyboard") setMode(null);
              else show("keyboard");
            } else {
              point.current = { x: event.clientX, y: event.clientY };
              show("pointer");
              placePhoto();
            }
          }}
        >
          {text}
          <span className="sr-only">
            {t("crewPhotoHint", { name: member.name })}
          </span>
        </button>
      ) : (
        <div className={styles.crewTrigger}>{text}</div>
      )}
      {mode === "touch" && photo && (
        <span id={photoId} className={styles.crewTouchPhoto}>
          <Image
            src={photo}
            alt={t("crewPortrait", { name: member.name })}
            fill
            sizes="(max-width: 767px) 80vw, 240px"
            unoptimized
            className={styles.cover}
          />
        </span>
      )}
      {opened &&
        photo &&
        createPortal(
          <span
            ref={floatingPhoto}
            id={mode === "touch" ? undefined : photoId}
            role="img"
            aria-label={t("crewPortrait", { name: member.name })}
            aria-hidden={mode !== "pointer" && mode !== "keyboard"}
            data-visible={mode === "pointer" || mode === "keyboard"}
            className={styles.crewFloatingPhoto}
          >
            <span className={styles.crewPhotoInner}>
              <Image
                src={photo}
                alt=""
                fill
                sizes="240px"
                unoptimized
                className={styles.cover}
              />
            </span>
          </span>,
          document.body,
        )}
    </article>
  );
}
