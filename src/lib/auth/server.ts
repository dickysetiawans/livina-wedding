import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import type { SessionContext } from "@/lib/crew/types";

export const accessCookie = "livina-access";
export const refreshCookie = "livina-refresh";
const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
export const authConfigured = Boolean(
  base && key && !key.startsWith("sb_secret_"),
);
export class AuthError extends Error {
  constructor(public status: number) {
    super("AUTH_REQUEST_FAILED");
  }
}
export async function supabaseFetch(
  path: string,
  token: string,
  init: RequestInit = {},
) {
  if (!authConfigured) throw new AuthError(503);
  return fetch(`${base}/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(path.startsWith("rest/")
        ? {
            "Accept-Profile": "organizer",
            "Content-Profile": "organizer",
            Prefer: "return=representation",
          }
        : {}),
      ...init.headers,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
}
export async function verifySession(
  token: string,
): Promise<SessionContext | null> {
  if (!token || token.length > 8192 || !authConfigured) return null;
  try {
    const identity = await supabaseFetch("auth/v1/user", token);
    if (!identity.ok) return null;
    const user = (await identity.json()) as { id?: string };
    const response = await supabaseFetch("rest/v1/rpc/session_context", token, {
      method: "POST",
      body: "{}",
    });
    if (!response.ok) return null;
    const context = (await response.json()) as SessionContext | null;
    return context &&
      user.id &&
      context.user?.id === user.id &&
      Array.isArray(context.permissions)
      ? context
      : null;
  } catch {
    return null;
  }
}
export const serverSession = cache(async () => {
  const token = (await cookies()).get(accessCookie)?.value || "";
  const context = await verifySession(token);
  return context ? { token, context } : null;
});
export async function setSession(
  access: string,
  refresh: string,
  expiresIn = 3600,
) {
  const jar = await cookies();
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
  jar.set(accessCookie, access, {
    ...options,
    maxAge: Math.max(1, Math.min(expiresIn, 86400)),
  });
  jar.set(refreshCookie, refresh, { ...options, maxAge: 60 * 60 * 24 * 7 });
}
export async function clearServerSession() {
  const jar = await cookies();
  jar.delete(accessCookie);
  jar.delete(refreshCookie);
}
export async function routeSession() {
  const current = await serverSession();
  if (current) return current;
  const refresh = (await cookies()).get(refreshCookie)?.value;
  if (!refresh || !authConfigured) return null;
  try {
    const response = await fetch(
      `${base}/auth/v1/token?grant_type=refresh_token`,
      {
        method: "POST",
        headers: { apikey: key, "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refresh }),
        cache: "no-store",
        signal: AbortSignal.timeout(20000),
      },
    );
    if (!response.ok) {
      await clearServerSession();
      return null;
    }
    const value = (await response.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };
    const context = await verifySession(value.access_token);
    if (!context) {
      await clearServerSession();
      return null;
    }
    await setSession(value.access_token, value.refresh_token, value.expires_in);
    return { token: value.access_token, context };
  } catch {
    return null;
  }
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return Boolean(
    origin &&
    origin === new URL(request.url).origin &&
    request.headers.get("sec-fetch-site") !== "cross-site",
  );
}
export const privateHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Cookie",
};
