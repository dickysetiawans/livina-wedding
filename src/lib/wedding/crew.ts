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
export function splitCrew(members: WeddingCrewProfile[]) {
  return {
    owner: members.find((member) => member.is_founder) ?? null,
    crew: members
      .filter((member) => !member.is_founder)
      .sort((a, b) => a.sort_order - b.sort_order),
  };
}
export function crewPositionKey(member: WeddingCrewProfile) {
  return (
    member.position_id || `legacy:${member.role_title.trim().toLowerCase()}`
  );
}
export function crewPositions(members: WeddingCrewProfile[]) {
  const positions = new Map<
    string,
    { id: string; name: string; sort_order: number }
  >();
  for (const member of members)
    if (!member.is_founder && member.role_title.trim()) {
      const id = crewPositionKey(member);
      positions.set(id, {
        id,
        name: member.role_title,
        sort_order: member.position_sort_order ?? 0,
      });
    }
  return [...positions.values()].sort(
    (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name),
  );
}
