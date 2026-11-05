"use client";
import { useState } from "react";
import {
  splitCrew,
  crewPositions,
  crewPositionKey,
  type WeddingCrewProfile,
} from "@/lib/wedding/crew";
export default function useCrewFilter(members: WeddingCrewProfile[]) {
  const [selected, select] = useState<string | null>(null);
  const { crew } = splitCrew(members),
    positions = crewPositions(crew);
  const active = positions.some((position) => position.id === selected)
    ? selected
    : null;
  return {
    positions,
    active,
    select,
    members:
      active === null
        ? crew
        : crew.filter((member) => crewPositionKey(member) === active),
  };
}
