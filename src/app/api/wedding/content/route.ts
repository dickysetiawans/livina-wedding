import { weddingPageContent } from "@/lib/wedding/page-content";

export async function GET() {
  return Response.json(await weddingPageContent(), {
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
