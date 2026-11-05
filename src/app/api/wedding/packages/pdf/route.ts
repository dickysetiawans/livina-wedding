import { weddingContent } from "@/lib/wedding/content";
import { buildPackagePdf } from "@/lib/wedding/package-pdf";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  if (new URL(request.url).search) return new Response(null, { status: 400 });
  const content = await weddingContent(),
    catalog = content.package_catalog;
  if (!catalog?.packages.length) return new Response(null, { status: 404 });
  const packages = [...catalog.packages]
    .sort((a, b) => {
      const ca = catalog.categories.find((row) => row.id === a.category_id),
        cb = catalog.categories.find((row) => row.id === b.category_id);
      return (
        (ca?.sort_order ?? 0) - (cb?.sort_order ?? 0) ||
        a.category_id.localeCompare(b.category_id) ||
        (catalog.subcategories.find((row) => row.id === a.subcategory_id)
          ?.sort_order ?? 0) -
          (catalog.subcategories.find((row) => row.id === b.subcategory_id)
            ?.sort_order ?? 0) ||
        (a.subcategory_id || "").localeCompare(b.subcategory_id || "") ||
        a.package_kind.localeCompare(b.package_kind) ||
        a.sort_order - b.sort_order ||
        a.id.localeCompare(b.id)
      );
    })
    .map((item) => ({
      ...item,
      group_label: [
        catalog.categories.find((row) => row.id === item.category_id)?.name,
        catalog.subcategories.find((row) => row.id === item.subcategory_id)
          ?.name,
        item.package_kind === "all_in" ? "All In" : "Non Venue",
      ]
        .filter(Boolean)
        .join(" / "),
    }));
  const pdf = buildPackagePdf({
    brand: content.settings?.brand_name || "Livina Wedding",
    label: "Koleksi Paket Pernikahan",
    packages,
  });
  return new Response(pdf as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="semua-paket-livina.pdf"',
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
