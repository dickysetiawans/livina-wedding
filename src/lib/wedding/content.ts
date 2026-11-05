import "server-only";
import { emptyCatalog, type PackageCatalog } from "./packages";
import type { WhatsAppContact } from "./whatsapp";
import { publicConfigured, publicRpc } from "@/lib/crew/public";
import type { PublicCrewMember } from "@/lib/crew/types";
export interface WeddingService {
  id: string;
  title: string;
  description: string;
  highlight: string | null;
}
export interface TestimonialCrewMember {
  id: string;
  crew_id: string;
  name: string;
  position_name: string;
  photo_media_id: string | null;
  video_media_id: string | null;
}
export interface WeddingTestimonial {
  crew_assignments?: TestimonialCrewMember[];
  created_at?: string;
  event_id?: string | null;
  event_name?: string | null;
  event_sort_order?: number | null;
  id: string;
  couple_name: string;
  venue: string;
  excerpt: string;
  photo_media_id: string | null;
  photo_url?: string | null;
  full_review?: string;
  video_media_id?: string | null;
}
export interface WeddingContent {
  package_catalog?: PackageCatalog;
  settings: {
    package_inquiry_template?: string | null;
    brand_name: string;
    hero_title: string;
    hero_subtitle: string;
    film_title?: string | null;
    contact_email: string;
    whatsapp_number: string | null;
    whatsapp_contacts?: WhatsAppContact[];
    copyright_start_year: number;
    hero_video_id?: string | null;
    hero_poster_id?: string | null;
    logo_media_id?: string | null;
  } | null;
  services: WeddingService[];
  team_members: PublicCrewMember[];
  testimonials: WeddingTestimonial[];
  social_links: { id: string; platform: string; label: string; url: string }[];
}
export async function weddingContent(): Promise<WeddingContent> {
  const empty: WeddingContent = {
    package_catalog: emptyCatalog,
    settings: null,
    services: [],
    team_members: [],
    testimonials: [],
    social_links: [],
  };
  if (!publicConfigured) return empty;
  try {
    const content = await publicRpc<WeddingContent>("public_content");
    return {
      package_catalog: content.package_catalog || emptyCatalog,
      settings: content.settings || null,
      services: content.services || [],
      team_members: content.team_members || [],
      testimonials: content.testimonials || [],
      social_links: content.social_links || [],
    };
  } catch {
    return empty;
  }
}
