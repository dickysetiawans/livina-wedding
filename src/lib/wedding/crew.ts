import type { PublicCrewMember } from "@/lib/crew/types";

export interface WeddingCrewProfile extends PublicCrewMember {
  is_founder: boolean;
  sort_order: number;
  photo_url?: string | null;
}

export interface WeddingCrewResponse {
  meta: { source: "preview" | "supabase"; total: number };
  data: WeddingCrewProfile[];
}
