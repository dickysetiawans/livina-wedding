import { publicConfigured, publicPhotoUrl, publicRpc } from "@/lib/crew/public";
import { uuidPattern } from "@/lib/crew/validation";

export async function GET(
  request: Request,
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
    const content = await publicRpc<{
      media: { id: string; storage_path: string; kind?: string }[];
    }>("public_content");
    const media = content.media.find((item) => item.id === id);
    if (!media) return new Response(null, { status: 404, headers });
    if (media.kind === "video") {
      // Keep the browser on the permanent application URL. A redirect exposes
      // a 60-second signed URL that can expire on a later loop/range request.
      const range = request.headers.get("range");
      if (range && !/^bytes=(?:\d+-\d*|-\d+)$/.test(range))
        return new Response(null, { status: 416, headers });
      const response = await fetch(await publicPhotoUrl(media.storage_path), {
        headers: range ? { Range: range } : {},
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.any([request.signal, AbortSignal.timeout(120000)]),
      });
      if (![200, 206, 416].includes(response.status))
        return new Response(null, {
          status: response.status === 404 ? 404 : 503,
          headers,
        });
      const streamHeaders = new Headers({
        ...headers,
        "Content-Type": "video/mp4",
      });
      for (const name of [
        "Accept-Ranges",
        "Content-Length",
        "Content-Range",
        "ETag",
        "Last-Modified",
      ]) {
        const value = response.headers.get(name);
        if (value) streamHeaders.set(name, value);
      }
      return new Response(response.body, {
        status: response.status,
        headers: streamHeaders,
      });
    }
    return new Response(null, {
      status: 302,
      headers: {
        ...headers,
        Location: await publicPhotoUrl(media.storage_path),
      },
    });
  } catch {
    return new Response(null, { status: 503, headers });
  }
}
