"use client";

import type {
  CrewInput,
  CrewMember,
  CrewQuery,
  ListResult,
  MediaFile,
  SessionContext,
} from "./types";
import { crewPayload, validateCrew, uuidPattern } from "./validation";

const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
export const configured = Boolean(base && key && !key.startsWith("sb_secret_"));

type Session = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  expires_in?: number;
};
export class CrewApiError extends Error {
  constructor(
    public code: string,
    public status = 0,
  ) {
    super(code);
  }
}
export function clearSession() {
  sessionStorage.removeItem("livina-admin-session");
}
async function decode<T>(
  response: Response,
  unauthorizedCode = "session",
): Promise<T> {
  const result =
    response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const mediaCodes: Record<string, string> = {
      PHOTO_INVALID: "photoInvalid",
      VIDEO_FORMAT: "videoFormat",
      VIDEO_LIMIT: "videoLimit",
      VIDEO_POSTER: "videoPoster",
    };
    const code =
      (response.status === 422 && mediaCodes[result?.code]) ||
      (response.status === 429
        ? "rateLimit"
        : response.status === 401
          ? result?.code === "CAPTCHA_FAILED"
            ? "captchaRejected"
            : result?.code === "ACCOUNT_ACCESS_UNAVAILABLE"
              ? "accountAccess"
              : result?.code === "AUTH_REJECTED"
                ? "authRejected"
                : unauthorizedCode
          : response.status === 403
            ? "forbidden"
            : response.status === 503
              ? "unavailable"
              : "request");
    throw new CrewApiError(code, response.status);
  }
  return result as T;
}
async function call<T>(
  path: string,
  method: string,
  body?: unknown,
  auth = true,
): Promise<T> {
  if (!configured) throw new CrewApiError("configuration");
  const headers: Record<string, string> = {
    apikey: key,
    "Content-Type": "application/json",
  };
  try {
    return await decode<T>(
      await fetch(auth ? `/api/organizer/${path}` : `${base}/${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        cache: "no-store",
        credentials: auth ? "same-origin" : "omit",
        signal: AbortSignal.timeout(25000),
      }),
      auth ? "session" : "authRejected",
    );
  } catch (error) {
    if (error instanceof CrewApiError) {
      if (error.status === 401 && auth) clearSession();
      throw error;
    }
    throw new CrewApiError("network");
  }
}
export function context() {
  return fetch("/api/auth/session", {
    cache: "no-store",
    credentials: "same-origin",
  }).then((response) => decode<SessionContext | null>(response));
}
export async function login(email: string, password: string) {
  const result = await call<{ session: Session; context: SessionContext }>(
    "functions/v1/organizer-api",
    "POST",
    {
      action: "login",
      email: email.trim().toLowerCase(),
      password,
    },
    false,
  );
  const saved = await decode<SessionContext>(
    await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(result.session),
    }),
    "sessionSetup",
  );
  clearSession();
  return saved;
}
export async function logout() {
  try {
    await decode(
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      }),
    );
  } finally {
    clearSession();
  }
}
export function listCrew(query: CrewQuery) {
  return call<ListResult<CrewMember>>("rest/v1/rpc/list_data", "POST", {
    p_module: "team_members",
    p_page: query.page,
    p_per_page: query.perPage,
    p_search: query.search.trim(),
    p_sort_by: query.sort,
    p_sort_order: query.direction,
    p_filters: query.status ? { status: query.status } : {},
  });
}
export async function saveCrew(value: CrewInput, id?: string) {
  if (Object.keys(validateCrew(value)).length || (id && !uuidPattern.test(id)))
    throw new CrewApiError("validation");
  const rows = await call<CrewMember[]>(
    `rest/v1/team_members${id ? `?id=eq.${id}` : ""}`,
    id ? "PATCH" : "POST",
    crewPayload(value),
  );
  if (!rows.length) throw new CrewApiError("stale");
  return rows[0];
}
export async function deleteCrew(id: string) {
  if (!uuidPattern.test(id)) throw new CrewApiError("validation");
  const rows = await call<CrewMember[]>(
    `rest/v1/team_members?id=eq.${id}`,
    "DELETE",
  );
  if (!rows.length) throw new CrewApiError("stale");
}
export function listPhotos(page: number, search: string) {
  return call<ListResult<MediaFile>>("rest/v1/rpc/list_data", "POST", {
    p_module: "media_files",
    p_page: page,
    p_per_page: 10,
    p_search: search,
    p_sort_by: "created_at",
    p_sort_order: "desc",
    p_filters: { kind: "image" },
  });
}
export function getMedia(id: string) {
  return call<MediaFile[]>(
    `rest/v1/media_files?id=eq.${id}&select=id,original_name,status,alt_text,kind`,
    "GET",
  );
}
export function photoUrl(id: string) {
  return call<{ url: string }>("functions/v1/organizer-api", "POST", {
    action: "media-url",
    id,
  });
}
export async function uploadPhoto(
  file: File,
  altText: string,
): Promise<string> {
  if (file.type !== "image/webp") throw new CrewApiError("file");
  return uploadMedia(file, altText, "image");
}
export async function uploadVideo(
  file: File,
  posterId: string,
): Promise<string> {
  if (!uuidPattern.test(posterId)) throw new CrewApiError("videoPoster");
  return uploadMedia(file, "", "video", posterId);
}
async function uploadMedia(
  file: File,
  altText: string,
  kind: "image" | "video",
  posterId?: string,
): Promise<string> {
  if (
    !(
      kind === "image"
        ? ["image/jpeg", "image/png", "image/webp"]
        : ["video/mp4"]
    ).includes(file.type) ||
    !file.size ||
    file.size > (kind === "image" ? 5242880 : 20971520)
  )
    throw new CrewApiError("file");
  if (kind === "image" && (!altText.trim() || altText.trim().length > 300))
    throw new CrewApiError("alt");
  const signed = await call<{ id: string; url: string }>(
    "functions/v1/organizer-api",
    "POST",
    {
      action: kind === "image" ? "upload-photo" : "upload-video",
      name: file.name,
      size: file.size,
      mime: file.type,
      kind,
      alt_text: altText.trim(),
      is_decorative: false,
    },
  );
  const target = new URL(
    signed.url.startsWith("/object/") ? `/storage/v1${signed.url}` : signed.url,
    base,
  );
  if (
    target.origin !== new URL(base).origin ||
    !target.pathname.startsWith("/storage/v1/object/upload/sign/")
  )
    throw new CrewApiError("request");
  const result = await fetch(target, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
    signal: AbortSignal.timeout(120000),
  });
  if (!result.ok) throw new CrewApiError("upload");
  await call("functions/v1/organizer-api", "POST", {
    action: kind === "image" ? "finish-photo" : "finish-video",
    id: signed.id,
    ...(kind === "video" ? { poster_id: posterId } : {}),
  });
  return signed.id;
}
export { call as organizerRequest };
export async function deletePhoto(id: string) {
  if (!uuidPattern.test(id)) throw new CrewApiError("validation");
  await call("functions/v1/organizer-api", "POST", {
    action: "delete-media",
    id,
  });
}
