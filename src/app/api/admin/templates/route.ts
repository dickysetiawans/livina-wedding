import {
  routeSession,
  sameOrigin,
  privateHeaders,
  supabaseFetch,
} from "@/lib/auth/server";
async function session(action: "read" | "update") {
  const auth = await routeSession();
  if (!auth) return null;
  return auth.context.user.role === "admin" ||
    auth.context.permissions.includes(`templates.${action}`)
    ? auth
    : false;
}
export async function GET() {
  const auth = await session("read");
  if (!auth)
    return Response.json(null, {
      status: auth === null ? 401 : 403,
      headers: privateHeaders,
    });
  try {
    const [catalog, current] = await Promise.all([
      supabaseFetch(
        "rest/v1/templates?select=code,name,description&order=code",
        auth.token,
      ),
      supabaseFetch("rest/v1/rpc/public_template", auth.token, {
        method: "POST",
        body: "{}",
      }),
    ]);
    if (!catalog.ok || !current.ok)
      return Response.json(
        { code: "MIGRATION_REQUIRED" },
        { status: 503, headers: privateHeaders },
      );
    return Response.json(
      { templates: await catalog.json(), active: await current.json() },
      { headers: privateHeaders },
    );
  } catch {
    return Response.json(null, { status: 503, headers: privateHeaders });
  }
}
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json(null, { status: 403, headers: privateHeaders });
  const auth = await session("update");
  if (!auth)
    return Response.json(null, {
      status: auth === null ? 401 : 403,
      headers: privateHeaders,
    });
  try {
    const raw = await request.text();
    if (raw.length > 512)
      return Response.json(null, { status: 413, headers: privateHeaders });
    const { code } = JSON.parse(raw);
    if (!["style-1", "style-2"].includes(code))
      return Response.json(null, { status: 422, headers: privateHeaders });
    const response = await supabaseFetch(
      "rest/v1/rpc/set_template",
      auth.token,
      { method: "POST", body: JSON.stringify({ p_code: code }) },
    );
    return new Response(await response.text(), {
      status: response.status,
      headers: { ...privateHeaders, "Content-Type": "application/json" },
    });
  } catch {
    return Response.json(null, { status: 503, headers: privateHeaders });
  }
}
