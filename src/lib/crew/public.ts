import "server-only";
import type { PublicCrewMember } from "./types";

const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
export const publicConfigured = Boolean(
  base && key && !key.startsWith("sb_secret_"),
);

export async function publicRpc<T>(
  name:
    "public_crew" | "public_crew_photo" | "public_content" | "public_template",
  body: object = {},
  timeoutMs = 15000,
): Promise<T> {
  const response = await fetch(`${base}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: key,
      "Content-Type": "application/json",
      "Content-Profile": "organizer",
      "Accept-Profile": "organizer",
    },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error("PUBLIC_CREW_UNAVAILABLE");
  return response.json() as Promise<T>;
}
export async function publicCrew(): Promise<{
  members: PublicCrewMember[];
  failed: boolean;
}> {
  if (!publicConfigured) return { members: [], failed: false };
  try {
    return {
      members: await publicRpc<PublicCrewMember[]>("public_crew"),
      failed: false,
    };
  } catch {
    return { members: [], failed: true };
  }
}
export async function publicPhotoUrl(path: string): Promise<string> {
  const safePath = path.split("/").map(encodeURIComponent).join("/");
  const response = await fetch(
    `${base}/storage/v1/object/sign/organizer-media/${safePath}`,
    {
      method: "POST",
      headers: { apikey: key, "Content-Type": "application/json" },
      body: JSON.stringify({ expiresIn: 60 }),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    },
  );
  if (!response.ok) throw new Error("PUBLIC_PHOTO_UNAVAILABLE");
  const data = (await response.json()) as { signedURL: string };
  const target = new URL(`${base}/storage/v1${data.signedURL}`);
  if (target.origin !== new URL(base).origin)
    throw new Error("PUBLIC_PHOTO_UNAVAILABLE");
  return target.href;
}
