import "server-only";
import { cache } from "react";
import { weddingContent, type WeddingContent } from "./content";
import type { WeddingCrewProfile } from "./crew";

export interface WeddingHeroContent {
  brand_name: string;
  hero_title: string;
  hero_subtitle: string;
  film_title: string;
  hero_video_url: string;
  hero_poster_url: string;
}
export interface WeddingPageContent extends WeddingContent {
  hero: WeddingHeroContent;
  team_members: WeddingCrewProfile[];
}
export interface WeddingPageResponse {
  meta: {
    source: "preview" | "supabase";
    counts: { services: number; team_members: number; testimonials: number };
  };
  data: WeddingPageContent;
}

// Kedua halaman dan endpoint publik membaca provider yang sama; tidak melakukan
// fetch HTTP ke server sendiri saat SSR. Kontrak tetap sama saat backend diganti.
export const weddingPageContent = cache(
  async (): Promise<WeddingPageResponse> => {
    const content = await weddingContent();
    const data: WeddingPageContent = {
      ...content,
      hero: {
        brand_name: content.settings?.brand_name || "",
        hero_title: content.settings?.hero_title || "",
        hero_subtitle: content.settings?.hero_subtitle || "",
        film_title: content.settings?.film_title || "",
        hero_video_url: content.settings?.hero_video_id
          ? `/api/wedding/media/${content.settings.hero_video_id}`
          : "",
        hero_poster_url: content.settings?.hero_poster_id
          ? `/api/wedding/media/${content.settings.hero_poster_id}`
          : "",
      },
      team_members: content.team_members.map((member, index) => ({
        ...member,
        is_founder: member.is_founder ?? false,
        sort_order: member.sort_order ?? index,
      })),
    };
    return {
      meta: {
        source: "supabase",
        counts: {
          services: data.services.length,
          team_members: data.team_members.length,
          testimonials: data.testimonials.length,
        },
      },
      data,
    };
  },
);
