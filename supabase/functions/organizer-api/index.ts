// Runtime Supabase Edge/Deno; fetch dan Web Crypto bawaan, tanpa dependency baru.
const base = Deno.env.get("SUPABASE_URL")!;
const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const publishable = Deno.env.get("SUPABASE_ANON_KEY")!;
const origins = (Deno.env.get("ORGANIZER_ALLOWED_ORIGINS") || "")
  .split(",")
  .map((v) => v.trim())
  .filter(Boolean);
const hmacSecret = Deno.env.get("ORGANIZER_LOGIN_HMAC_SECRET") || "";
const ipHeader = Deno.env.get("ORGANIZER_TRUSTED_IP_HEADER") || "";
const encoder = new TextEncoder();
async function hmac(value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(hmacSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return Array.from(
    new Uint8Array(
      await crypto.subtle.sign("HMAC", key, encoder.encode(value)),
    ),
  )
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("");
}
async function rest(
  path: string,
  body?: unknown,
  method = "POST",
  token?: string,
) {
  // Pisahkan RPC pengguna dari operasi internal service role. JWT pengguna
  // dipasangkan dengan anon key, konsisten dengan verifier sesi di Next.js.
  const userScoped = token !== undefined;
  if (userScoped && !token) throw new Error("missing_user_token");
  const response = await fetch(`${base}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: userScoped ? publishable : secret,
      Authorization: `Bearer ${userScoped ? token : secret}`,
      "Content-Type": "application/json",
      "Content-Profile": "organizer",
      "Accept-Profile": "organizer",
      Prefer: "return=representation",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) throw new Error("database");
  return response.status === 204 ? null : response.json();
}
// Static WebP: ICC/EXIF/XMP are optional valid chunks, not corrupt photos.
// Preserve ICC for correct colors; strip EXIF/XMP and unknown metadata. Keep
// animation, dimensions, chunk bounds and one-frame validation strict.
function croppedWebp(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const text = (start: number, length: number) =>
    String.fromCharCode(...bytes.subarray(start, start + length));
  if (
    bytes.length < 26 ||
    bytes.length > 5242880 ||
    text(0, 4) !== "RIFF" ||
    text(8, 4) !== "WEBP" ||
    view.getUint32(4, true) + 8 !== bytes.length
  )
    throw new Error("invalid_container");
  let offset = 12,
    width = 0,
    height = 0,
    extendedWidth = 0,
    extendedHeight = 0,
    alpha = false,
    flags = 0,
    icc = false;
  const chunks: Uint8Array[] = [];
  let chunkCount = 0;
  while (offset < bytes.length) {
    if (++chunkCount > 4096) throw new Error("invalid_chunk");
    if (offset + 8 > bytes.length) throw new Error("invalid_chunk");
    const type = text(offset, 4),
      size = view.getUint32(offset + 4, true),
      at = offset + 8,
      end = at + size + (size % 2);
    if (end > bytes.length) throw new Error("invalid_chunk");
    if (type === "ANIM" || type === "ANMF") throw new Error("animated_photo");
    let keep = false;
    if (type === "VP8X") {
      if (offset !== 12 || size !== 10) throw new Error("invalid_chunk");
      flags = bytes[at];
      if (
        flags & 0x02 ||
        flags & 0xc1 ||
        bytes[at + 1] ||
        bytes[at + 2] ||
        bytes[at + 3]
      )
        throw new Error("unsupported_features");
      extendedWidth =
        1 + bytes[at + 4] + (bytes[at + 5] << 8) + (bytes[at + 6] << 16);
      extendedHeight =
        1 + bytes[at + 7] + (bytes[at + 8] << 8) + (bytes[at + 9] << 16);
      keep = true;
    } else if (type === "ICCP") {
      if (!extendedWidth || icc || alpha || width || !size || !(flags & 0x20))
        throw new Error("invalid_chunk");
      icc = true;
      keep = true;
    } else if (type === "ALPH") {
      if (!extendedWidth || alpha || width || !size || !(flags & 0x10))
        throw new Error("invalid_chunk");
      alpha = true;
      keep = true;
    } else if (type === "VP8 ") {
      if (
        width ||
        size < 10 ||
        bytes[at] & 1 ||
        text(at + 3, 3) !== "\x9d\x01\x2a"
      )
        throw new Error("invalid_frame");
      width = view.getUint16(at + 6, true) & 0x3fff;
      height = view.getUint16(at + 8, true) & 0x3fff;
      keep = true;
    } else if (type === "VP8L") {
      if (width || alpha || size < 5 || bytes[at] !== 0x2f)
        throw new Error("invalid_frame");
      const bits = view.getUint32(at + 1, true);
      if (bits >>> 29) throw new Error("invalid_frame");
      width = 1 + (bits & 0x3fff);
      height = 1 + ((bits >>> 14) & 0x3fff);
      keep = true;
    }
    if (keep) {
      const chunk = bytes.slice(offset, end);
      if (type === "VP8X") chunk[8] &= 0x30; // ICC + alpha only.
      if (size % 2) chunk[chunk.length - 1] = 0;
      chunks.push(chunk);
    }
    offset = end;
  }
  if (
    !width ||
    !height ||
    Math.max(width, height) > 1920 ||
    (extendedWidth && (width !== extendedWidth || height !== extendedHeight)) ||
    Boolean(flags & 0x20) !== icc
  )
    throw new Error("invalid_dimensions");
  const output = new Uint8Array(
    12 + chunks.reduce((sum, chunk) => sum + chunk.length, 0),
  );
  output.set(bytes.subarray(0, 12));
  new DataView(output.buffer).setUint32(4, output.length - 8, true);
  offset = 12;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }
  return { width, height, bytes: output };
}

// Direct upload accepts an already browser-compatible MP4, not arbitrary files
// renamed to .mp4. Read the actual ISO BMFF boxes and media track declarations.
function browserMp4(bytes: Uint8Array) {
  if (bytes.length < 32) throw new Error("invalid_video");
  if (bytes.length > 20971520) throw new Error("video_size");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const text = (at: number, count: number) =>
    String.fromCharCode(...bytes.subarray(at, at + count));
  type Box = { type: string; body: number; end: number };
  function boxes(start: number, end: number): Box[] {
    const result: Box[] = [];
    for (let at = start; at < end;) {
      if (at + 8 > end) throw new Error("invalid_video");
      let size = view.getUint32(at),
        header = 8;
      if (size === 1) {
        if (at + 16 > end) throw new Error("invalid_video");
        size = view.getUint32(at + 8) * 4294967296 + view.getUint32(at + 12);
        header = 16;
      } else if (!size) size = end - at;
      if (!Number.isSafeInteger(size) || size < header || at + size > end)
        throw new Error("invalid_video");
      if (result.length >= 4096) throw new Error("invalid_video");
      result.push({ type: text(at + 4, 4), body: at + header, end: at + size });
      at += size;
    }
    return result;
  }
  function child(parent: Box, type: string) {
    const found = boxes(parent.body, parent.end).filter(
      (box) => box.type === type,
    );
    if (found.length !== 1) throw new Error("invalid_video");
    return found[0];
  }
  function duration(box: Box) {
    const version = bytes[box.body];
    if (box.end - box.body < (version === 1 ? 32 : 20) || version > 1)
      throw new Error("invalid_video");
    const scale = view.getUint32(box.body + (version === 1 ? 20 : 12));
    const ticks =
      version === 1
        ? view.getUint32(box.body + 24) * 4294967296 +
          view.getUint32(box.body + 28)
        : view.getUint32(box.body + 16);
    const seconds = ticks / scale;
    if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 60)
      throw new Error("video_duration");
    return seconds;
  }
  const top = boxes(0, bytes.length),
    types = (type: string) => top.filter((box) => box.type === type);
  if (
    types("ftyp").length !== 1 ||
    types("moov").length !== 1 ||
    !types("mdat").some((box) => box.end > box.body) ||
    types("moof").length
  )
    throw new Error("invalid_video");
  const dataBoxes = types("mdat");
  if (dataBoxes.length > 16) throw new Error("invalid_video");
  const ftyp = types("ftyp")[0];
  if (ftyp.end - ftyp.body < 8 || (ftyp.end - ftyp.body) % 4)
    throw new Error("invalid_video");
  const brands = [text(ftyp.body, 4)];
  for (let at = ftyp.body + 8; at < ftyp.end; at += 4) brands.push(text(at, 4));
  if (
    !brands.some((brand) => /^(isom|iso[2-9]|mp4[12]|avc1|M4V )$/.test(brand))
  )
    throw new Error("video_format");
  const moov = types("moov")[0],
    tracks = boxes(moov.body, moov.end).filter((box) => box.type === "trak");
  let seconds = duration(child(moov, "mvhd")),
    width = 0,
    height = 0,
    videoCount = 0,
    audioCount = 0;
  if (!tracks.length || tracks.length > 2) throw new Error("video_format");
  for (const track of tracks) {
    const mdia = child(track, "mdia"),
      hdlr = child(mdia, "hdlr");
    if (hdlr.end - hdlr.body < 12) throw new Error("invalid_video");
    const handler = text(hdlr.body + 8, 4);
    seconds = Math.max(seconds, duration(child(mdia, "mdhd")));
    const minf = child(mdia, "minf"),
      stbl = child(minf, "stbl"),
      stsd = child(stbl, "stsd");
    if (stsd.end - stsd.body < 8 || view.getUint32(stsd.body + 4) !== 1)
      throw new Error("video_format");
    const entries = boxes(stsd.body + 8, stsd.end);
    if (
      entries.length !== 1 ||
      entries[0].end - entries[0].body < 8 ||
      view.getUint16(entries[0].body + 6) !== 1
    )
      throw new Error("video_format");
    const entry = entries[0];
    const dref = child(child(minf, "dinf"), "dref");
    if (dref.end - dref.body < 8 || view.getUint32(dref.body + 4) !== 1)
      throw new Error("video_format");
    const refs = boxes(dref.body + 8, dref.end);
    if (
      refs.length !== 1 ||
      refs[0].type !== "url " ||
      refs[0].end - refs[0].body !== 4 ||
      view.getUint32(refs[0].body) !== 1
    )
      throw new Error("video_format");
    if (handler === "vide") {
      videoCount++;
      if (!["avc1", "avc3"].includes(entry.type) || entry.end - entry.body < 78)
        throw new Error("video_format");
      width = view.getUint16(entry.body + 24);
      height = view.getUint16(entry.body + 26);
      const avcc = boxes(entry.body + 78, entry.end).filter(
        (box) => box.type === "avcC",
      );
      if (
        avcc.length !== 1 ||
        avcc[0].end - avcc[0].body < 7 ||
        bytes[avcc[0].body] !== 1
      )
        throw new Error("video_format");
    } else if (handler === "soun") {
      audioCount++;
      if (entry.type !== "mp4a") throw new Error("video_format");
    } else throw new Error("video_format");
    const offsets = boxes(stbl.body, stbl.end).filter(
      (box) => box.type === "stco" || box.type === "co64",
    );
    if (offsets.length !== 1) throw new Error("invalid_video");
    const offsetBox = offsets[0],
      step = offsetBox.type === "co64" ? 8 : 4;
    if (offsetBox.end - offsetBox.body < 8) throw new Error("invalid_video");
    const count = view.getUint32(offsetBox.body + 4);
    if (
      !count ||
      count > 200000 ||
      offsetBox.body + 8 + count * step !== offsetBox.end
    )
      throw new Error("invalid_video");
    for (let at = offsetBox.body + 8; at < offsetBox.end; at += step) {
      const offset =
        step === 8
          ? view.getUint32(at) * 4294967296 + view.getUint32(at + 4)
          : view.getUint32(at);
      if (
        !Number.isSafeInteger(offset) ||
        !dataBoxes.some((box) => offset >= box.body && offset < box.end)
      )
        throw new Error("invalid_video");
    }
  }
  if (
    videoCount !== 1 ||
    audioCount > 1 ||
    !width ||
    !height ||
    Math.max(width, height) > 1920 ||
    Math.min(width, height) > 1080
  )
    throw new Error("video_dimensions");
  return { width, height, duration_seconds: seconds };
}
Deno.serve(async (req) => {
  const origin = req.headers.get("origin") || "";
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": origins.includes(origin) ? origin : "",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Cache-Control": "no-store",
    Vary: "Origin",
  };
  const reply = (
    body: unknown,
    status = 200,
    extra: Record<string, string> = {},
  ) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...headers, ...extra },
    });
  if (!origins.includes(origin))
    return reply({ message: "Origin tidak diizinkan" }, 403);
  if (req.method === "OPTIONS")
    return new Response(null, { status: 204, headers });
  if (req.method !== "POST")
    return reply({ message: "Metode tidak diizinkan" }, 405);
  if (Number(req.headers.get("content-length") || 0) > 16384)
    return reply({ message: "Permintaan terlalu besar" }, 413);
  try {
    const raw = await req.text();
    if (raw.length > 16384)
      return reply({ message: "Permintaan terlalu besar" }, 413);
    const input = JSON.parse(raw);
    if (input.action === "login") {
      const email = String(input.email || "")
          .trim()
          .toLowerCase(),
        password = String(input.password || "");
      if (
        email.length > 254 ||
        !/^\S+@\S+\.\S+$/.test(email) ||
        !password ||
        password.length > 1024
      )
        return reply(
          { message: "Email dan kata sandi wajib diisi dengan benar" },
          422,
        );
      // Harus menunjuk header yang diatur/ditimpa gateway deployment, bukan header kiriman klien.
      const ip = ipHeader ? req.headers.get(ipHeader)?.trim() : "";
      if (
        hmacSecret.length < 32 ||
        !ip ||
        ip.length > 64 ||
        !/^[a-fA-F0-9:.]+$/.test(ip)
      )
        return reply(
          { message: "Konfigurasi keamanan login belum tersedia" },
          503,
        );
      const account = await hmac(`account:${email}`),
        ipHash = await hmac(`ip:${ip}`);
      const limit = await rest("rpc/take_login_attempt", {
        p_account: account,
        p_ip: ipHash,
      });
      if (limit.blocked)
        return reply(
          {
            message: "Terlalu banyak percobaan. Silakan coba lagi nanti.",
            retry_after_seconds: limit.retry_after_seconds,
          },
          429,
          { "Retry-After": String(limit.retry_after_seconds) },
        );
      const result = await fetch(`${base}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: { apikey: publishable, "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
        }),
      });
      const session = await result.json();
      if (!result.ok) {
        // Catat kategori terkontrol saja; jangan log respons Auth mentah atau input login.
        const knownCodes = new Set([
          "invalid_credentials",
          "invalid_grant",
          "captcha_failed",
          "email_not_confirmed",
          "email_provider_disabled",
          "provider_disabled",
          "user_banned",
          "over_request_rate_limit",
          "request_timeout",
          "unexpected_failure",
          "validation_failed",
        ]);
        const rawCode = session.error_code || session.code || session.error;
        const code = knownCodes.has(rawCode)
          ? rawCode
          : session.message === "Invalid API key"
            ? "invalid_api_key"
            : "unknown";
        console.warn(
          JSON.stringify({
            event: "organizer_login_rejected",
            stage: "auth",
            status: result.status,
            code,
          }),
        );
      }
      if (
        result.ok &&
        (typeof session.access_token !== "string" || !session.access_token)
      ) {
        console.warn(
          JSON.stringify({
            event: "organizer_login_rejected",
            stage: "auth",
            code: "invalid_auth_response",
          }),
        );
        return reply({ message: "Respons autentikasi tidak tersedia" }, 503);
      }
      const context = result.ok
        ? await rest("rpc/session_context", {}, "POST", session.access_token)
        : null;
      if (result.ok && !context)
        console.warn(
          JSON.stringify({
            event: "organizer_login_rejected",
            stage: "profile",
            code: "inactive_or_missing_context",
          }),
        );
      const success = result.ok && !!context;
      await rest("rpc/record_login_result", {
        p_account: account,
        p_ip: ipHash,
        p_success: success,
      });
      if (!success)
        return reply(
          {
            code: result.ok
              ? "ACCOUNT_ACCESS_UNAVAILABLE"
              : (session.error_code || session.code) === "captcha_failed"
                ? "CAPTCHA_FAILED"
                : "AUTH_REJECTED",
            message:
              "Email atau kata sandi salah, atau akun tidak memiliki akses",
          },
          401,
        );
      return reply({ session, context });
    }
    const token = req.headers.get("authorization")?.replace(/^Bearer /, "");
    if (!token) return reply({ message: "Silakan masuk terlebih dahulu" }, 401);
    const identity = await fetch(`${base}/auth/v1/user`, {
      headers: { apikey: publishable, Authorization: `Bearer ${token}` },
    });
    if (!identity.ok)
      return reply({ message: "Sesi berakhir. Silakan masuk kembali" }, 401);
    const actor = await identity.json();
    const context = await rest("rpc/session_context", {}, "POST", token);
    if (!context) return reply({ message: "Akses akun tidak tersedia" }, 403);
    const can = (code: string) =>
      context.user.role === "admin" || context.permissions.includes(code);
    if (
      input.action === "change-password" ||
      input.action === "reset-password"
    ) {
      const reset = input.action === "reset-password";
      if (
        context.user.id !== actor.id ||
        (reset && context.user.role !== "admin")
      )
        return reply({ code: "PASSWORD_FORBIDDEN" }, 403);
      const password = input.password,
        current = input.current_password;
      if (
        typeof password !== "string" ||
        password.length < 12 ||
        password.length > 1024 ||
        !/[A-Za-z]/.test(password) ||
        !/[0-9]/.test(password) ||
        typeof current !== "string" ||
        !current ||
        current.length > 1024
      )
        return reply({ code: "PASSWORD_INVALID" }, 422);
      if (password === current) return reply({ code: "PASSWORD_SAME" }, 422);
      if (
        reset &&
        (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          input.user_id || "",
        ) ||
          input.user_id === actor.id)
      )
        return reply({ code: "PASSWORD_INVALID" }, 422);
      const ip = ipHeader ? req.headers.get(ipHeader)?.trim() : "";
      if (
        hmacSecret.length < 32 ||
        !ip ||
        ip.length > 64 ||
        !/^[a-fA-F0-9:.]+$/.test(ip) ||
        typeof actor.email !== "string"
      )
        return reply({ code: "PASSWORD_UNAVAILABLE" }, 503);
      const account = await hmac(`account:${actor.email.trim().toLowerCase()}`),
        ipHash = await hmac(`ip:${ip}`);
      const limit = await rest("rpc/take_login_attempt", {
        p_account: account,
        p_ip: ipHash,
      });
      if (limit.blocked)
        return reply({ code: "PASSWORD_RATE_LIMIT" }, 429, {
          "Retry-After": String(limit.retry_after_seconds),
        });
      const verified = await fetch(
        `${base}/auth/v1/token?grant_type=password`,
        {
          method: "POST",
          headers: { apikey: publishable, "Content-Type": "application/json" },
          body: JSON.stringify({ email: actor.email, password: current }),
          signal: AbortSignal.timeout(15000),
        },
      );
      const proof = await verified.json().catch(() => ({}));
      const matches =
        verified.ok &&
        proof.user?.id === actor.id &&
        typeof proof.access_token === "string" &&
        !!proof.access_token;
      await rest("rpc/record_login_result", {
        p_account: account,
        p_ip: ipHash,
        p_success: matches,
      });
      if (!matches)
        return reply(
          {
            code:
              verified.status >= 500
                ? "PASSWORD_UNAVAILABLE"
                : "PASSWORD_CURRENT_INVALID",
          },
          verified.status >= 500 ? 503 : 422,
        );
      try {
        if (reset) {
          const target = await rest(
            `users?id=eq.${input.user_id}&select=id`,
            undefined,
            "GET",
          );
          if (!target.length)
            return reply({ code: "PASSWORD_USER_MISSING" }, 404);
        }
        const updated = await fetch(
          reset
            ? `${base}/auth/v1/admin/users/${input.user_id}`
            : `${base}/auth/v1/user`,
          {
            method: "PUT",
            headers: {
              apikey: reset ? secret : publishable,
              Authorization: `Bearer ${reset ? secret : proof.access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(
              reset ? { password } : { password, current_password: current },
            ),
            signal: AbortSignal.timeout(15000),
          },
        );
        if (!updated.ok) {
          const error = await updated.json().catch(() => ({}));
          const code = error.error_code || error.code;
          return reply(
            {
              code:
                code === "weak_password"
                  ? "PASSWORD_WEAK"
                  : code === "same_password"
                    ? "PASSWORD_SAME"
                    : code === "reauthentication_needed" ||
                        code === "insufficient_aal"
                      ? "PASSWORD_REAUTH"
                      : "PASSWORD_FAILED",
            },
            updated.status >= 500 ? 503 : 422,
          );
        }
        return reply({ ok: true, sign_out: !reset });
      } finally {
        await fetch(`${base}/auth/v1/logout?scope=local`, {
          method: "POST",
          headers: {
            apikey: publishable,
            Authorization: `Bearer ${proof.access_token}`,
          },
          signal: AbortSignal.timeout(5000),
        }).catch(() => {});
      }
    }
    if (input.action === "media-url") {
      if (!can("media.read") || !/^[0-9a-f-]{36}$/i.test(input.id || ""))
        return reply({ message: "Tidak memiliki izin" }, 403);
      const rows = await rest(
        `media_files?id=eq.${input.id}&status=eq.ready`,
        undefined,
        "GET",
      );
      if (!rows.length) return reply({ message: "Media belum siap" }, 409);
      const media = rows[0];
      async function signedUrl(path: string) {
        const response = await fetch(
          `${base}/storage/v1/object/sign/organizer-media/${path}`,
          {
            method: "POST",
            headers: {
              apikey: secret,
              Authorization: `Bearer ${secret}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ expiresIn: 60 }),
          },
        );
        if (!response.ok) throw new Error("storage");
        const result = await response.json();
        return `${base}/storage/v1${result.signedURL}`;
      }
      let poster_url = null;
      if (media.poster_media_id) {
        const poster = await rest(
          `media_files?id=eq.${media.poster_media_id}&status=eq.ready`,
          undefined,
          "GET",
        );
        if (poster.length) poster_url = await signedUrl(poster[0].storage_path);
      }
      return reply({
        id: media.id,
        status: media.status,
        url: await signedUrl(media.storage_path),
        mime_type: media.mime_type,
        size_bytes: media.size_bytes,
        width: media.width,
        height: media.height,
        duration_seconds: media.duration_seconds,
        poster_url,
      });
    }
    if (input.action === "create-user") {
      if (context.user.role !== "admin")
        return reply({ message: "Tidak memiliki izin" }, 403);
      const email = String(input.email || "")
          .trim()
          .toLowerCase(),
        name = String(input.name || "").trim();
      if (
        !/^\S+@\S+\.\S+$/.test(email) ||
        email.length > 254 ||
        !name ||
        name.length > 150 ||
        !/^[0-9a-f-]{36}$/i.test(input.role_id || "")
      )
        return reply({ message: "Nama, email dan role wajib valid" }, 422);
      const phone = String(input.phone || "").trim();
      if (phone && !/^\+[1-9][0-9]{7,14}$/.test(phone))
        return reply({ message: "Nomor telepon tidak valid" }, 422);
      const roles = await rest(
        `roles?id=eq.${input.role_id}&is_active=eq.true&select=id`,
        undefined,
        "GET",
      );
      if (!roles.length) return reply({ message: "Role tidak tersedia" }, 422);
      if (input.is_active !== undefined && typeof input.is_active !== "boolean")
        return reply({ message: "Status akun tidak valid" }, 422);
      const profiles = await rest(
        `users?email=eq.${encodeURIComponent(email)}&select=id`,
        undefined,
        "GET",
      );
      if (profiles.length)
        return reply(
          {
            code: "USER_EXISTS",
            message: "Pengguna sudah terdaftar. Edit profil yang ada.",
          },
          409,
        );
      let user: { id: string; email?: string };
      if (input.auth_user_id) {
        if (
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            input.auth_user_id,
          )
        )
          return reply({ message: "UUID Auth tidak valid" }, 422);
        const existing = await fetch(
          `${base}/auth/v1/admin/users/${input.auth_user_id}`,
          { headers: { apikey: secret, Authorization: `Bearer ${secret}` } },
        );
        if (!existing.ok)
          return reply({ message: "Akun Auth tidak ditemukan" }, 422);
        user = await existing.json();
        if (user.email?.trim().toLowerCase() !== email)
          return reply({ message: "Email harus sama dengan akun Auth" }, 422);
      } else {
        const invited = await fetch(
          `${base}/auth/v1/invite?redirect_to=${encodeURIComponent(new URL("/admin/accept-invite", origin).href)}`,
          {
            method: "POST",
            headers: {
              apikey: secret,
              Authorization: `Bearer ${secret}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ email, data: { name } }),
          },
        );
        if (!invited.ok)
          return reply(
            {
              message:
                "Undangan akun gagal dikirim. Periksa email dan konfigurasi SMTP.",
            },
            422,
          );
        user = await invited.json();
      }
      try {
        await rest("users", {
          id: user.id,
          name,
          email,
          role_id: input.role_id,
          phone: phone || null,
          is_active: input.is_active !== false,
        });
      } catch {
        return reply(
          {
            message:
              "Akun Auth dipertahankan, tetapi profil belum berhasil dihubungkan. Hubungkan UUID Auth melalui form pengguna.",
            auth_user_id: user.id,
          },
          409,
        );
      }
      return reply({ message: "Pengguna berhasil ditambahkan" }, 201);
    }
    if (["upload", "upload-photo", "upload-video"].includes(input.action)) {
      if (!can("media.create"))
        return reply({ message: "Tidak memiliki izin unggah" }, 403);
      const name = String(input.name || "")
          .replace(/[\\/\x00-\x1f]/g, "")
          .slice(0, 255),
        size = Number(input.size),
        kind = input.kind;
      const mime = String(input.mime || "");
      const direct = input.action !== "upload";
      if (
        input.action === "upload-video" &&
        (kind !== "video" || mime !== "video/mp4" || size > 20971520)
      )
        return reply(
          {
            code: size > 20971520 ? "VIDEO_LIMIT" : "VIDEO_FORMAT",
            message: "Gunakan MP4 H.264 maksimal 20 MB, 60 detik dan Full HD",
          },
          422,
        );
      const allowed =
        kind === "image"
          ? ["image/jpeg", "image/png", "image/webp"]
          : kind === "video"
            ? ["video/mp4", "video/webm"]
            : [];
      if (
        !name ||
        !Number.isSafeInteger(size) ||
        size < 1 ||
        size > (kind === "image" ? 5242880 : 41943040) ||
        !allowed.includes(mime) ||
        (input.action === "upload-photo" &&
          (kind !== "image" || mime !== "image/webp"))
      )
        return reply({ message: "Jenis atau ukuran file tidak sesuai" }, 422);
      const alt = String(input.alt_text || "").trim();
      if (
        alt.length > 300 ||
        (kind === "image" && input.is_decorative !== true && !alt)
      )
        return reply(
          { message: "Deskripsi foto wajib diisi, maksimal 300 karakter" },
          422,
        );
      const id = crypto.randomUUID(),
        path = `${actor.id}/${id}/source`;
      await rest("media_files", {
        id,
        kind,
        processing_mode: direct ? "direct" : "worker",
        status: direct ? "processing" : "pending",
        original_name: name,
        source_size_bytes: size,
        source_path: path,
        uploaded_by: actor.id,
        alt_text: alt,
        is_decorative: input.is_decorative === true,
      });
      const signed = await fetch(
        `${base}/storage/v1/object/upload/sign/organizer-staging/${path}`,
        {
          method: "POST",
          headers: {
            apikey: secret,
            Authorization: `Bearer ${secret}`,
            "Content-Type": "application/json",
          },
          body: "{}",
        },
      );
      if (!signed.ok) {
        await rest(
          `media_files?id=eq.${id}`,
          { status: "failed", error_code: "UPLOAD_URL_FAILED" },
          "PATCH",
        );
        return reply({ message: "Persiapan unggahan gagal" }, 500);
      }
      return reply({ id, ...(await signed.json()) });
    }
    if (input.action === "finish-photo" || input.action === "finish-video") {
      const video = input.action === "finish-video";
      if (!can("media.create") || !/^[0-9a-f-]{36}$/i.test(input.id || ""))
        return reply({ message: "Tidak memiliki izin" }, 403);
      const [media] = await rest(
        `media_files?id=eq.${input.id}&uploaded_by=eq.${actor.id}`,
        undefined,
        "GET",
      );
      if (
        !media ||
        media.kind !== (video ? "video" : "image") ||
        media.processing_mode !== "direct"
      )
        return reply({ message: "Media tidak ditemukan" }, 404);
      if (media.status === "ready") return reply({ id: media.id });
      if (video) {
        if (!/^[0-9a-f-]{36}$/i.test(input.poster_id || ""))
          return reply({ code: "VIDEO_POSTER" }, 422);
        const [poster] = await rest(
          `media_files?id=eq.${input.poster_id}&uploaded_by=eq.${actor.id}&kind=eq.image&status=eq.ready`,
          undefined,
          "GET",
        );
        if (!poster) return reply({ code: "VIDEO_POSTER" }, 422);
      }
      const sourcePath = `${actor.id}/${media.id}/source`;
      if (media.source_path !== sourcePath)
        return reply({ message: "Sumber tidak valid" }, 422);
      const storageHeaders = {
        apikey: secret,
        Authorization: `Bearer ${secret}`,
      };
      const source = await fetch(
        `${base}/storage/v1/object/authenticated/organizer-staging/${sourcePath}`,
        { headers: storageHeaders, signal: AbortSignal.timeout(15000) },
      );
      if (!source.ok || !source.body)
        return reply({ message: "Unggah media belum selesai" }, 409);
      const reader = source.body.getReader(),
        chunks: Uint8Array[] = [];
      let length = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > (video ? 20971520 : 5242880)) {
          await reader.cancel();
          return reply({ code: video ? "VIDEO_LIMIT" : "PHOTO_INVALID" }, 422);
        }
        chunks.push(value);
      }
      if (length !== Number(media.source_size_bytes))
        return reply(
          {
            code: video ? "VIDEO_FORMAT" : "PHOTO_INVALID",
            message: "Ukuran media tidak sesuai",
          },
          422,
        );
      const bytes = new Uint8Array(length);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
      }
      let output = bytes,
        properties: {
          width: number;
          height: number;
          duration_seconds?: number;
        };
      try {
        if (video) properties = browserMp4(bytes);
        else {
          const photo = croppedWebp(bytes);
          output = photo.bytes;
          properties = { width: photo.width, height: photo.height };
        }
      } catch (error) {
        const known = [
          "invalid_container",
          "invalid_chunk",
          "animated_photo",
          "unsupported_features",
          "invalid_frame",
          "invalid_dimensions",
          "video_size",
          "video_duration",
          "video_dimensions",
          "video_format",
          "invalid_video",
        ];
        const reason =
          error instanceof Error && known.includes(error.message)
            ? error.message
            : "invalid_media";
        console.warn(
          JSON.stringify({
            event: "organizer_media_rejected",
            kind: video ? "video" : "image",
            code: reason,
          }),
        );
        return reply(
          {
            code: video
              ? ["video_size", "video_duration", "video_dimensions"].includes(
                  reason,
                )
                ? "VIDEO_LIMIT"
                : "VIDEO_FORMAT"
              : "PHOTO_INVALID",
            message: video
              ? "Video tidak sesuai format atau batas website"
              : "Foto crop tidak valid",
          },
          422,
        );
      }
      const path = `${actor.id}/${media.id}/${video ? "video.mp4" : "photo.webp"}`;
      const mime = video ? "video/mp4" : "image/webp";
      const uploaded = await fetch(
        `${base}/storage/v1/object/organizer-media/${path}`,
        {
          method: "POST",
          headers: {
            ...storageHeaders,
            "Content-Type": mime,
            "x-upsert": "true",
          },
          body: output,
          signal: AbortSignal.timeout(15000),
        },
      );
      if (!uploaded.ok) throw new Error("storage");
      await rest(
        `media_files?id=eq.${media.id}&uploaded_by=eq.${actor.id}`,
        {
          status: "ready",
          storage_bucket: "organizer-media",
          storage_path: path,
          mime_type: mime,
          size_bytes: output.length,
          ...properties,
          ...(video ? { poster_media_id: input.poster_id } : {}),
          error_code: null,
        },
        "PATCH",
      );
      // Keep staging until normal deletion; a signed PUT cannot overwrite the
      // separately validated object in the private result bucket.
      return reply({ id: media.id });
    }
    if (input.action === "delete-media") {
      if (!can("media.delete") || !/^[0-9a-f-]{36}$/i.test(input.id || ""))
        return reply({ message: "Akses atau ID tidak valid" }, 403);
      const rows = await rest(
        `media_files?id=eq.${input.id}`,
        undefined,
        "GET",
      );
      if (!rows.length) return reply({ message: "Media tidak ditemukan" }, 404);
      // FK RESTRICT menolak media yang masih digunakan sebelum objek dihapus.
      try {
        await rest(`media_files?id=eq.${input.id}`, undefined, "DELETE");
      } catch {
        return reply(
          { message: "Media masih digunakan dan tidak dapat dihapus" },
          409,
        );
      }
      for (const [bucket, path] of [
        ["organizer-staging", rows[0].source_path],
        ["organizer-media", rows[0].storage_path],
      ]) {
        if (path)
          await fetch(`${base}/storage/v1/object/${bucket}`, {
            method: "DELETE",
            headers: {
              apikey: secret,
              Authorization: `Bearer ${secret}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ prefixes: [path] }),
          });
      }
      return reply({ message: "Media dihapus" });
    }
    return reply({ message: "Aksi tidak dikenal" }, 422);
  } catch {
    return reply(
      {
        message:
          "Permintaan gagal diproses. Periksa konfigurasi server dan input.",
      },
      500,
    );
  }
});
