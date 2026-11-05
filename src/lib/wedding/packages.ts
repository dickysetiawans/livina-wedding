export interface PackageCategory {
  id: string;
  name: string;
  has_subcategories: boolean;
  sort_order: number;
}
export interface PackageSubcategory {
  id: string;
  category_id: string;
  name: string;
  sort_order: number;
}
export interface WeddingPackage {
  id: string;
  name: string;
  category_id: string;
  subcategory_id: string | null;
  package_kind: "all_in" | "non_venue";
  price: number;
  benefits: string[];
  sort_order: number;
}
export interface PackagePhoto {
  id: string;
  name: string;
  category_id: string;
  subcategory_id: string | null;
  photo_media_id: string;
  caption: string | null;
  sort_order: number;
}
export interface PackageCatalog {
  categories: PackageCategory[];
  subcategories: PackageSubcategory[];
  packages: WeddingPackage[];
  gallery: PackagePhoto[];
}
export const emptyCatalog: PackageCatalog = {
  categories: [],
  subcategories: [],
  packages: [],
  gallery: [],
};
export function packageSelection(
  catalog: PackageCatalog,
  categoryId: string | null,
  subcategoryId: string | null,
  kind: string,
) {
  const ordered = <T extends { sort_order: number; id: string }>(rows: T[]) =>
    [...rows].sort(
      (a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id),
    );
  const categories = ordered(catalog.categories).filter(
    (category) =>
      catalog.packages.some((row) => row.category_id === category.id) ||
      catalog.gallery.some((row) => row.category_id === category.id),
  );
  const category =
    categories.find((row) => row.id === categoryId) || categories[0] || null;
  const subcategories = category?.has_subcategories
    ? ordered(catalog.subcategories).filter(
        (row) =>
          row.category_id === category.id &&
          (catalog.packages.some((item) => item.subcategory_id === row.id) ||
            catalog.gallery.some((item) => item.subcategory_id === row.id)),
      )
    : [];
  const subcategory =
    subcategories.find((row) => row.id === subcategoryId) ||
    subcategories[0] ||
    null;
  const matches = (row: {
    category_id: string;
    subcategory_id: string | null;
  }) =>
    row.category_id === category?.id &&
    row.subcategory_id === (subcategory?.id ?? null);
  const kinds = ["all_in", "non_venue"].filter((value) =>
    catalog.packages.some((row) => matches(row) && row.package_kind === value),
  );
  const selectedKind = kinds.includes(kind) ? kind : kinds[0] || "all_in";
  return {
    categories,
    category,
    subcategories,
    subcategory,
    kinds,
    kind: selectedKind,
    packages: ordered(
      catalog.packages.filter(
        (row) => matches(row) && row.package_kind === selectedKind,
      ),
    ),
    gallery: ordered(catalog.gallery.filter(matches)),
  };
}
