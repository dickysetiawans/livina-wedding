"use client";
import { useTranslations } from "next-intl";
import type { TestimonialEvent } from "@/lib/wedding/testimonial-events";
import styles from "./StoryEventFilter.module.css";
interface StoryEventFilterProps {
  events: TestimonialEvent[];
  active: string | null;
  onChange: (id: string | null) => void;
  tone: "dark" | "light";
  controls: string;
  count: number;
  kind?: "events" | "positions";
}
export default function StoryEventFilter({
  events,
  active,
  onChange,
  tone,
  controls,
  count,
  kind = "events",
}: StoryEventFilterProps) {
  const t = useTranslations("wedding");
  if (!events.length && count === 0) return null;
  return (
    <>
      <div
        role="group"
        aria-label={t(
          kind === "events" ? "storiesEventFilter" : "crewPositionFilter",
        )}
        data-tone={tone}
        className={styles.filters}
      >
        {[
          {
            id: null,
            name: t(
              kind === "events" ? "storiesAllEvents" : "crewAllPositions",
            ),
          },
          ...events,
        ].map((event) => (
          <button
            key={event.id ?? "all"}
            type="button"
            aria-pressed={active === event.id}
            aria-controls={controls}
            onClick={() => onChange(event.id)}
            className={styles.button}
          >
            {event.name}
          </button>
        ))}
      </div>
      <p role="status" aria-live="polite" className="sr-only">
        {t(kind === "events" ? "storiesResultCount" : "crewResultCount", {
          count,
        })}
      </p>
    </>
  );
}
