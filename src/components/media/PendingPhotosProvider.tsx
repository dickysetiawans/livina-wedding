"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
import { PendingPhotos } from "@/lib/media/pending";
const Context = createContext<PendingPhotos | null>(null);
export default function PendingPhotosProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [photos] = useState(() => new PendingPhotos());
  return <Context.Provider value={photos}>{children}</Context.Provider>;
}
export function usePendingPhotos() {
  const value = useContext(Context);
  if (!value) throw new Error("Photo field requires a form provider");
  return value;
}
