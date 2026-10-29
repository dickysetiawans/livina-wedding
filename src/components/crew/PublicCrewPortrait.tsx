"use client";

import Image from "next/image";
import { useState } from "react";

interface PublicCrewPortraitProps {
  id: string | null;
  name: string;
}
export default function PublicCrewPortrait({
  id,
  name,
}: PublicCrewPortraitProps) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="relative flex aspect-4/5 w-full items-center justify-center overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-800">
      {id && !failed ? (
        <Image
          src={`/api/crew/photo/${id}`}
          alt={name}
          fill
          unoptimized
          sizes="(max-width: 640px) 100vw, 40vw"
          className="object-cover grayscale motion-safe:transition-all motion-safe:duration-500 motion-safe:group-hover:grayscale-0"
          onError={() => setFailed(true)}
        />
      ) : (
        <span
          aria-hidden="true"
          className="font-editorial text-title-xl text-gray-400 dark:text-gray-500"
        >
          {name
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((part) => part[0])
            .join("")
            .toUpperCase()}
        </span>
      )}
    </div>
  );
}
