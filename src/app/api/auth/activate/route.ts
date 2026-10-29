import {
  sameOrigin,
  privateHeaders,
  verifySession,
  supabaseFetch,
  setSession,
} from "@/lib/auth/server";
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json(null, { status: 403, headers: privateHeaders });
  try {
    const raw = await request.text();
    if (raw.length > 16384)
      return Response.json(null, { status: 413, headers: privateHeaders });
    const { access_token, refresh_token, password } = JSON.parse(raw);
    if (
      typeof access_token !== "string" ||
      access_token.length > 8192 ||
      typeof refresh_token !== "string" ||
      !refresh_token ||
      refresh_token.length > 4096 ||
      typeof password !== "string" ||
      password.length < 12 ||
      password.length > 1024 ||
      !/[A-Za-z]/.test(password) ||
      !/[0-9]/.test(password)
    )
      return Response.json(null, { status: 422, headers: privateHeaders });
    const context = await verifySession(access_token);
    if (!context)
      return Response.json(null, { status: 401, headers: privateHeaders });
    const response = await supabaseFetch("auth/v1/user", access_token, {
      method: "PUT",
      body: JSON.stringify({ password }),
    });
    if (!response.ok)
      return Response.json(null, { status: 422, headers: privateHeaders });
    await setSession(access_token, refresh_token);
    return Response.json({ ok: true }, { headers: privateHeaders });
  } catch {
    return Response.json(null, { status: 503, headers: privateHeaders });
  }
}
