import {
  privateHeaders,
  routeSession,
  sameOrigin,
  supabaseFetch,
  clearServerSession,
} from "@/lib/auth/server";
import {
  moduleCodes,
  serviceSlug,
  modules,
  adminPayload,
  validateAdminValues,
  type AdminValues,
} from "@/lib/admin/modules";
import { uuidPattern } from "@/lib/crew/validation";
import { passwordPayload } from "@/lib/auth/password";

async function handle(request: Request, params: Promise<{ path: string[] }>) {
  if (request.method !== "GET" && !sameOrigin(request))
    return Response.json(null, { status: 403, headers: privateHeaders });
  const path = (await params).path.join("/");
  const collection = path.match(/^rest\/v1\/([a-z_]+)$/)?.[1];
  const moduleCode = moduleCodes.find(
    (code) => modules[code].table === collection,
  );
  const allowed =
    (path === "rest/v1/rpc/list_data" && request.method === "POST") ||
    (path === "rest/v1/rpc/session_context" && request.method === "POST") ||
    ((collection === "team_members" || Boolean(moduleCode)) &&
      ["GET", "POST", "PATCH", "DELETE"].includes(request.method)) ||
    (path === "rest/v1/rpc/set_role_permissions" &&
      request.method === "POST") ||
    (path === "rest/v1/media_files" && request.method === "GET") ||
    (path === "functions/v1/organizer-api" && request.method === "POST");
  if (!allowed)
    return Response.json(null, { status: 404, headers: privateHeaders });
  const session = await routeSession();
  if (!session)
    return Response.json(null, { status: 401, headers: privateHeaders });
  if (
    ((moduleCode &&
      modules[moduleCode].adminOnly &&
      request.method !== "GET") ||
      path === "rest/v1/rpc/set_role_permissions") &&
    session.context.user.role !== "admin"
  )
    return Response.json(null, { status: 403, headers: privateHeaders });
  if (collection && ["PATCH", "DELETE"].includes(request.method)) {
    const query = new URL(request.url).searchParams;
    const id = query.get("id")?.replace(/^eq\./, "") || "";
    if (
      !query.get("id")?.startsWith("eq.") ||
      !uuidPattern.test(id) ||
      [...query.keys()].some((key) => key !== "id")
    )
      return Response.json(null, { status: 422, headers: privateHeaders });
  }
  try {
    let body = ["GET", "DELETE"].includes(request.method)
      ? undefined
      : await request.text();
    if (body && body.length > (moduleCode === "website" ? 131072 : 32768))
      return Response.json(null, { status: 413, headers: privateHeaders });
    if (moduleCode && body && ["POST", "PATCH"].includes(request.method)) {
      if (moduleCode === "users" && request.method === "POST")
        return Response.json(null, { status: 403, headers: privateHeaders });
      const input = JSON.parse(body) as AdminValues;
      if (
        !input ||
        Array.isArray(input) ||
        Object.keys(
          validateAdminValues(moduleCode, input, request.method === "PATCH"),
        ).length
      )
        return Response.json(
          { code: "VALIDATION" },
          { status: 422, headers: privateHeaders },
        );
      body = JSON.stringify(
        adminPayload(moduleCode, input, request.method === "PATCH"),
      );
    }
    if (path === "rest/v1/rpc/set_role_permissions") {
      const input = JSON.parse(body || "{}");
      if (
        !uuidPattern.test(input.p_role_id || "") ||
        !Array.isArray(input.p_permission_ids) ||
        input.p_permission_ids.length > 200 ||
        input.p_permission_ids.some(
          (id: unknown) => typeof id !== "string" || !uuidPattern.test(id),
        )
      )
        return Response.json(null, { status: 422, headers: privateHeaders });
      body = JSON.stringify({
        p_role_id: input.p_role_id,
        p_permission_ids: input.p_permission_ids,
      });
    }
    if (path.startsWith("functions/")) {
      const action = JSON.parse(body || "{}").action;
      if (
        ![
          "upload",
          "upload-photo",
          "finish-photo",
          "upload-video",
          "finish-video",
          "media-url",
          "delete-media",
          "create-user",
          "change-password",
          "reset-password",
        ].includes(action)
      )
        return Response.json(null, { status: 403, headers: privateHeaders });
      if (
        ["create-user", "reset-password"].includes(action) &&
        session.context.user.role !== "admin"
      )
        return Response.json(null, { status: 403, headers: privateHeaders });
      if (["change-password", "reset-password"].includes(action)) {
        const value = passwordPayload(JSON.parse(body || "{}"));
        if (
          !value ||
          (action === "reset-password" &&
            value.user_id === session.context.user.id)
        )
          return Response.json(
            { code: "PASSWORD_INVALID" },
            { status: 422, headers: privateHeaders },
          );
        body = JSON.stringify(value);
      }
    }
    let response = await supabaseFetch(
      path + new URL(request.url).search,
      session.token,
      {
        method: request.method,
        body,
        headers: path.startsWith("functions/")
          ? { Origin: new URL(request.url).origin }
          : {},
      },
    );
    // The database unique constraint arbitrates concurrent requests. Retry only
    // slug collisions; never hide permission, validation or other DB failures.
    if (
      moduleCode === "services" &&
      body &&
      ["POST", "PATCH"].includes(request.method)
    ) {
      const payload = JSON.parse(body),
        baseSlug = serviceSlug(payload.title);
      for (let suffix = 2; suffix <= 11 && response.status === 409; suffix++) {
        const conflict = await response
          .clone()
          .json()
          .catch(() => null);
        if (
          conflict?.code !== "23505" ||
          !String(conflict.message || "").includes("slug")
        )
          break;
        const slug = `${baseSlug}-${suffix}`;
        if (slug === payload.slug) continue;
        payload.slug = slug;
        response = await supabaseFetch(
          path + new URL(request.url).search,
          session.token,
          {
            method: request.method,
            body: JSON.stringify(payload),
          },
        );
      }
    }
    if (
      response.ok &&
      path.startsWith("functions/") &&
      body &&
      JSON.parse(body).action === "change-password"
    )
      await clearServerSession();
    return new Response(
      response.status === 204 ? null : await response.text(),
      {
        status: response.status,
        headers: { ...privateHeaders, "Content-Type": "application/json" },
      },
    );
  } catch {
    return Response.json(null, { status: 503, headers: privateHeaders });
  }
}
export const GET = (
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) => handle(request, params);
export const POST = GET;
export const PATCH = GET;
export const DELETE = GET;
