import type { WeddingPackage, PackageCatalog } from "./packages";
import type { WhatsAppContact } from "./whatsapp";
export function shortPrice(price: number) {
  const format = (value: number) =>
    new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(value);
  return (
    "Rp. " +
    (price >= 1000000000
      ? format(price / 1000000000) + "M"
      : price >= 1000000
        ? format(price / 1000000) + "jt"
        : price >= 1000
          ? format(price / 1000) + "Rb"
          : format(price))
  );
}
export function packageMessage(
  template: string,
  item: WeddingPackage,
  catalog: PackageCatalog,
  contact: WhatsAppContact,
  date = new Date(),
) {
  const hour = date.getHours();
  const values: Record<string, string> = {
    sapaan:
      hour >= 5 && hour < 11
        ? "pagi"
        : hour >= 11 && hour < 15
          ? "siang"
          : hour >= 15 && hour < 18
            ? "sore"
            : "malam",
    nama_kontak: contact.label,
    kategori:
      catalog.categories.find((row) => row.id === item.category_id)?.name || "",
    subkategori:
      catalog.subcategories.find((row) => row.id === item.subcategory_id)
        ?.name || "-",
    jenis_paket: item.package_kind === "all_in" ? "All In" : "Non Venue",
    nama_paket: item.name,
    harga: new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(item.price),
    benefit: item.benefits.map((text) => "• " + text).join("\n"),
  };
  return template.replace(
    /\{([^{}]+)\}/g,
    (_, key: string) => values[key] ?? "",
  );
}
export function withoutOwnerLabel(text: string) {
  return text
    .replace(/\b(?:the\s+)?owner\b/gi, "")
    .replace(/^[\s,:;|–—-]+|[\s,:;|–—-]+$/g, "")
    .trim();
}
