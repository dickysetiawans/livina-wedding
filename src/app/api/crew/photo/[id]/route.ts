import { publicConfigured, publicPhotoUrl, publicRpc } from "@/lib/crew/public";
import { uuidPattern } from "@/lib/crew/validation";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const headers = {
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  };
  if (!publicConfigured || !uuidPattern.test(id))
    return new Response(null, { status: 404, headers });
  try {
    const photo = await publicRpc<{
      storage_path?: string;
      path?: string;
    } | null>("public_crew_photo", { p_id: id });
    if (!photo) return new Response(null, { status: 404, headers });
    // Current RPC uses storage_path; path was used by the earlier crew schema.
    const path = photo.storage_path ?? photo.path;
    if (typeof path !== "string" || !path)
      return new Response(null, { status: 503, headers });
    return new Response(null, {
      status: 302,
      headers: { ...headers, Location: await publicPhotoUrl(path) },
    });
  } catch {
    return new Response(null, { status: 503, headers });
  }
}
