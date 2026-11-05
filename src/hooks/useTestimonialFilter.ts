"use client";
import { useState } from "react";
import type { WeddingTestimonial } from "@/lib/wedding/content";
import {
  testimonialEvents,
  eventTestimonials,
  newestTestimonials,
} from "@/lib/wedding/testimonial-events";
export default function useTestimonialFilter(reviews: WeddingTestimonial[]) {
  const [state, setState] = useState<{
    selected: string | null;
    limit: number;
  }>({ selected: null, limit: 6 });
  const events = testimonialEvents(reviews);
  const active = events.some((event) => event.id === state.selected)
    ? state.selected
    : null;
  const matching = eventTestimonials(newestTestimonials(reviews), active);
  const limit = active === state.selected ? state.limit : 6;
  return {
    events,
    active,
    select: (id: string | null) => setState({ selected: id, limit: 6 }),
    reviews: matching.slice(0, limit),
    total: matching.length,
    hasMore: matching.length > limit,
    showMore: () =>
      setState((current) => ({
        selected: active,
        limit: (current.selected === active ? current.limit : 6) + 6,
      })),
  };
}
