import type { WeddingTestimonial } from "./content";
export interface TestimonialEvent {
  id: string;
  name: string;
  sort_order: number;
}
export function testimonialEvents(
  reviews: WeddingTestimonial[],
): TestimonialEvent[] {
  const events = new Map<string, TestimonialEvent>();
  for (const review of reviews) {
    if (review.event_id && review.event_name?.trim())
      events.set(review.event_id, {
        id: review.event_id,
        name: review.event_name,
        sort_order: review.event_sort_order ?? 0,
      });
  }
  return [...events.values()].sort(
    (a, b) =>
      a.sort_order - b.sort_order ||
      a.name.localeCompare(b.name) ||
      a.id.localeCompare(b.id),
  );
}
export function eventTestimonials(
  reviews: WeddingTestimonial[],
  eventId: string | null,
) {
  return eventId === null
    ? reviews
    : reviews.filter((review) => review.event_id === eventId);
}
export function newestTestimonials(reviews: WeddingTestimonial[]) {
  return reviews
    .map((review, index) => ({ review, index }))
    .sort((a, b) => {
      const first = Date.parse(a.review.created_at || "") || 0;
      const second = Date.parse(b.review.created_at || "") || 0;
      return second - first || a.index - b.index;
    })
    .map(({ review }) => review);
}
