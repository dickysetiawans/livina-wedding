"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { photoUrl } from "@/lib/crew/client";

interface CrewPortraitProps {
  id: string | null;
  name: string;
  className?: string;
}
export default function CrewPortrait({
  id,
  name,
  className = "h-12 w-12",
}: CrewPortraitProps) {
  const [source, setSource] = useState<{ id: string; url: string } | null>(
    null,
  );
  useEffect(() => {
    if (!id) return;
    let active = true;
    const load = () =>
      photoUrl(id)
        .then((result) => {
          if (active) setSource({ id, url: result.url });
        })
        .catch(() => {
          if (active) setSource(null);
        });
    void load();
    const timer = setInterval(load, 45000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [id]);
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase();
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-100 font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300 ${className}`}
    >
      {source && source.id === id ? (
        <Image
          src={source.url}
          alt={name}
          fill
          unoptimized
          className="object-cover"
          onError={() => setSource(null)}
        />
      ) : (
        <span aria-hidden="true">{initials || "—"}</span>
      )}
    </span>
  );
}
