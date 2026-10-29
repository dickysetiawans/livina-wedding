import {
  clearServerSession,
  privateHeaders,
  routeSession,
  sameOrigin,
  setSession,
  verifySession,
} from "@/lib/auth/server";

export async function GET() {
  const session = await routeSession();
  return Response.json(session?.context || null, {
    status: session ? 200 : 401,
    headers: privateHeaders,
  });
}
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json(null, { status: 403, headers: privateHeaders });
  try {
    const raw = await request.text();
    if (raw.length > 16384)
      return Response.json(null, { status: 413, headers: privateHeaders });
    const value = JSON.parse(raw) as {
      access_token?: unknown;
      refresh_token?: unknown;
      expires_in?: number;
    };
    if (
      typeof value.access_token !== "string" ||
      typeof value.refresh_token !== "string" ||
      !value.refresh_token ||
      value.refresh_token.length > 8192
    )
      return Response.json(null, { status: 422, headers: privateHeaders });
    const context = await verifySession(value.access_token);
    if (!context) {
      await clearServerSession();
      return Response.json(null, { status: 401, headers: privateHeaders });
    }
    // Jangan percaya expiry dari browser. Validitas token tetap diperiksa ke Auth setiap request.
    await setSession(value.access_token, value.refresh_token);
    return Response.json(context, { headers: privateHeaders });
  } catch {
    return Response.json(null, { status: 400, headers: privateHeaders });
  }
}
