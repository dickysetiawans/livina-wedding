import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { WeddingPackage } from "./packages";
interface PdfPackage extends WeddingPackage {
  group_label?: string;
}
function plain(text: string) {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[–—]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\x20-\x7e\n]/g, " ");
}
function escape(text: string) {
  return plain(text)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}
function fontData(name: string) {
  const bytes = readFileSync(
    join(process.cwd(), "public/fonts/poppins/" + name + ".ttf"),
  );
  const tables: Record<string, number> = {};
  for (let n = 0; n < bytes.readUInt16BE(4); n++) {
    const at = 12 + n * 16;
    tables[bytes.toString("ascii", at, at + 4)] = bytes.readUInt32BE(at + 8);
  }
  const unit = bytes.readUInt16BE(tables.head + 18),
    metrics = bytes.readUInt16BE(tables.hhea + 34),
    cm = tables.cmap;
  let map = 0;
  for (let n = 0; n < bytes.readUInt16BE(cm + 2); n++) {
    const at = cm + 4 + n * 8,
      offset = cm + bytes.readUInt32BE(at + 4);
    if (bytes.readUInt16BE(offset) === 4 && bytes.readUInt16BE(at) === 3) {
      map = offset;
      break;
    }
  }
  if (!map) throw new Error("FONT_CMAP");
  const count = bytes.readUInt16BE(map + 6) / 2,
    end = map + 14,
    start = end + count * 2 + 2,
    delta = start + count * 2,
    range = delta + count * 2;
  const widths = Array.from({ length: 95 }, (_, i) => {
    const code = i + 32;
    let glyph = 0;
    for (let n = 0; n < count; n++) {
      if (code > bytes.readUInt16BE(end + n * 2)) continue;
      if (code < bytes.readUInt16BE(start + n * 2)) break;
      const offset = bytes.readUInt16BE(range + n * 2),
        shift = bytes.readInt16BE(delta + n * 2);
      glyph = offset
        ? bytes.readUInt16BE(
            range +
              n * 2 +
              offset +
              (code - bytes.readUInt16BE(start + n * 2)) * 2,
          )
        : code;
      if (!offset || glyph) glyph = (glyph + shift) & 65535;
      break;
    }
    return Math.round(
      (bytes.readUInt16BE(tables.hmtx + Math.min(glyph, metrics - 1) * 4) *
        1000) /
        unit,
    );
  });
  return {
    bytes,
    widths,
    ascent: Math.round((bytes.readInt16BE(tables.hhea + 4) * 1000) / unit),
    descent: Math.round((bytes.readInt16BE(tables.hhea + 6) * 1000) / unit),
  };
}
let fonts: ReturnType<typeof fontData>[] | undefined;
export function buildPackagePdf({
  brand,
  label,
  packages,
}: {
  brand: string;
  label: string;
  packages: PdfPackage[];
}): Uint8Array {
  fonts ??= [fontData("Poppins-Regular"), fontData("Poppins-SemiBold")];
  const pages: string[][] = [];
  let commands: string[] = [],
    y = 0;
  const text = (
    value: string,
    x: number,
    at: number,
    size = 10,
    bold = false,
    color = "0.12 0.19 0.16",
  ) =>
    commands.push(
      `${color} rg BT /F${bold ? 2 : 1} ${size} Tf 1 0 0 1 ${x} ${at} Tm (${escape(value)}) Tj ET`,
    );
  const rounded = (x: number, at: number, w: number, h: number) => {
    const r = 12,
      k = 0.55228475 * r;
    commands.push(
      `1 1 1 rg ${x + r} ${at} m ${x + w - r} ${at} l ${x + w - r + k} ${at} ${x + w} ${at + r - k} ${x + w} ${at + r} c ${x + w} ${at + h - r} l ${x + w} ${at + h - r + k} ${x + w - r + k} ${at + h} ${x + w - r} ${at + h} c ${x + r} ${at + h} l ${x + r - k} ${at + h} ${x} ${at + h - r + k} ${x} ${at + h - r} c ${x} ${at + r} l ${x} ${at + r - k} ${x + r - k} ${at} ${x + r} ${at} c f`,
    );
  };
  const newPage = () => {
    commands = [];
    pages.push(commands);
    commands.push(
      "0.97 0.96 0.93 rg 0 0 595 842 re f",
      "0.07 0.21 0.18 rg 0 756 595 86 re f",
    );
    text(brand || "Livina Wedding", 36, 800, 20, true, "1 1 1");
    text(label, 36, 776, 10, false, "0.85 0.81 0.69");
    y = 728;
  };
  const lines = (value: string, size: number, bold = false) => {
    const widths = fonts![bold ? 1 : 0].widths;
    const measure = (s: string) =>
      [...s].reduce(
        (total, char) =>
          total + ((widths[char.charCodeAt(0) - 32] || 600) * size) / 1000,
        0,
      );
    const result: string[] = [];
    for (const paragraph of plain(value).split("\n")) {
      let rest = paragraph;
      if (!rest) result.push("");
      while (rest) {
        let end = 0;
        while (end < rest.length && measure(rest.slice(0, end + 1)) <= 475)
          end++;
        end = Math.max(1, end);
        const space = rest.lastIndexOf(" ", end);
        if (end < rest.length && space > 0) end = space;
        result.push(rest.slice(0, end).trim());
        rest = rest.slice(end).trimStart();
      }
    }
    return result;
  };
  newPage();
  let group = "";
  for (const item of packages) {
    if (item.group_label !== group) {
      group = item.group_label || "";
      if (y < 180) newPage();
      for (const row of lines(group, 12, true)) {
        text(row, 38, y, 12, true);
        y -= 19;
      }
      y -= 10;
    }
    const title = lines(item.name, 15, true),
      benefits = item.benefits.flatMap((value) => lines("- " + value, 10));
    let first = true;
    while (first || benefits.length) {
      if (y < 170) newPage();
      const head = first ? title : lines(item.name + " (lanjutan)", 15, true),
        headerHeight = head.length * 23 + (first ? 40 : 12),
        capacity = Math.max(1, Math.floor((y - 65 - headerHeight - 30) / 17));
      const chunk = benefits.splice(0, capacity),
        height = headerHeight + chunk.length * 17 + 30;
      rounded(30, y - height, 535, height);
      let at = y - 25;
      for (const row of head) {
        text(row, 48, at, 15, true);
        at -= 23;
      }
      if (first) {
        text(
          new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            maximumFractionDigits: 0,
          }).format(item.price),
          48,
          at,
          13,
          true,
          "0.53 0.38 0.16",
        );
        at -= 25;
      }
      for (const row of chunk) {
        text(row, 48, at, 10);
        at -= 17;
      }
      y -= height + 20;
      first = false;
      if (benefits.length) newPage();
    }
  }
  pages.forEach((page, n) =>
    page.push(
      `0.45 0.45 0.4 rg BT /F1 9 Tf 36 25 Td (Livina | ${n + 1} / ${pages.length}) Tj ET`,
    ),
  );
  const objects: (string | Buffer)[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "",
  ];
  for (let n = 0; n < 2; n++) {
    const f = fonts[n],
      id = 3 + n * 3,
      fontName = n ? "Poppins-SemiBold" : "Poppins-Regular";
    objects.push(
      `<< /Type /Font /Subtype /TrueType /BaseFont /${fontName} /FirstChar 32 /LastChar 126 /Widths [${f.widths.join(" ")}] /FontDescriptor ${id + 1} 0 R /Encoding /WinAnsiEncoding >>`,
      `<< /Type /FontDescriptor /FontName /${fontName} /Flags 32 /FontBBox [-500 -400 1500 1200] /ItalicAngle 0 /Ascent ${f.ascent} /Descent ${f.descent} /CapHeight 700 /StemV 80 /FontFile2 ${id + 2} 0 R >>`,
      Buffer.concat([
        Buffer.from(
          `<< /Length ${f.bytes.length} /Length1 ${f.bytes.length} >>\nstream\n`,
        ),
        f.bytes,
        Buffer.from("\nendstream"),
      ]),
    );
  }
  const ids: number[] = [];
  pages.forEach((page) => {
    const id = objects.length + 1;
    ids.push(id);
    const stream = page.join("\n");
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 6 0 R >> >> /Contents ${id + 1} 0 R >>`,
      `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    );
  });
  objects[1] = `<< /Type /Pages /Count ${ids.length} /Kids [${ids.map((id) => id + " 0 R").join(" ")}] >>`;
  const chunks = [Buffer.from("%PDF-1.4\n")],
    offsets = [0];
  let length = chunks[0].length;
  objects.forEach((object, n) => {
    offsets.push(length);
    const chunk = Buffer.concat([
      Buffer.from(`${n + 1} 0 obj\n`),
      Buffer.isBuffer(object) ? object : Buffer.from(object),
      Buffer.from("\nendobj\n"),
    ]);
    chunks.push(chunk);
    length += chunk.length;
  });
  chunks.push(
    Buffer.from(
      `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n` +
        offsets
          .slice(1)
          .map((at) => String(at).padStart(10, "0") + " 00000 n \n")
          .join("") +
        `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${length}\n%%EOF\n`,
    ),
  );
  return new Uint8Array(Buffer.concat(chunks));
}
