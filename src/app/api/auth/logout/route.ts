import {
  clearServerSession,
  privateHeaders,
  sameOrigin,
  serverSession,
  supabaseFetch,
} from "@/lib/auth/server";

export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json(null, { status: 403, headers: privateHeaders });
  try {
    const session = await serverSession();
    if (session)
      await supabaseFetch("auth/v1/logout?scope=local", session.token, {
        method: "POST",
      });
  } catch {
    /* Cookie lokal tetap dicabut jika penyedia tidak dapat dijangkau. */
  }
  await clearServerSession();
  return Response.json({ ok: true }, { headers: privateHeaders });
}
