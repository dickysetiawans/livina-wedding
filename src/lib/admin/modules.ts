import {
  validWhatsAppContacts,
  validInquiryTemplate,
  type WhatsAppContact,
} from "@/lib/wedding/whatsapp";
export type ModuleCode =
  | "users"
  | "roles"
  | "permissions"
  | "clients"
  | "services"
  | "website"
  | "events"
  | "positions"
  | "package_categories"
  | "package_subcategories"
  | "packages"
  | "package_gallery";
export interface CrewAssignment {
  id: string;
  crew_id: string;
  position_id: string;
  position_name?: string;
  crew_name?: string;
  photo_media_id: string | null;
  video_media_id: string | null;
}
export type AdminValue =
  | string
  | number
  | boolean
  | null
  | WhatsAppContact[]
  | string[]
  | CrewAssignment[];
export type AdminRecord = { id: string } & Record<string, AdminValue>;
export type AdminValues = Record<string, AdminValue>;
export interface AdminField {
  key: string;
  type:
    | "text"
    | "email"
    | "textarea"
    | "number"
    | "checkbox"
    | "status"
    | "role"
    | "image"
    | "video"
    | "contacts"
    | "event"
    | "package_category"
    | "package_subcategory"
    | "package_kind"
    | "benefits"
    | "crew_assignments";
  required?: boolean;
  max?: number;
  createOnly?: boolean;
}
export interface ModuleDefinition {
  table: string;
  permission: string;
  sort: string;
  adminOnly?: boolean;
  singleton?: boolean;
  columns: string[];
  fields: AdminField[];
}
export const modules: Record<ModuleCode, ModuleDefinition> = {
  package_categories: {
    table: "package_categories",
    permission: "package_categories",
    sort: "sort_order",
    columns: ["name", "has_subcategories", "is_active", "sort_order"],
    fields: [
      { key: "name", type: "text", required: true, max: 150 },
      { key: "has_subcategories", type: "checkbox" },
      { key: "is_active", type: "checkbox" },
      { key: "sort_order", type: "number", required: true },
    ],
  },
  package_subcategories: {
    table: "package_subcategories",
    permission: "package_subcategories",
    sort: "sort_order",
    columns: ["name", "category_name", "is_active", "sort_order"],
    fields: [
      { key: "category_id", type: "package_category", required: true },
      { key: "name", type: "text", required: true, max: 150 },
      { key: "is_active", type: "checkbox" },
      { key: "sort_order", type: "number", required: true },
    ],
  },
  packages: {
    table: "packages",
    permission: "packages",
    sort: "sort_order",
    columns: [
      "name",
      "category_name",
      "subcategory_name",
      "package_kind",
      "price",
      "status",
      "sort_order",
    ],
    fields: [
      { key: "name", type: "text", required: true, max: 150 },
      { key: "category_id", type: "package_category", required: true },
      { key: "subcategory_id", type: "package_subcategory" },
      { key: "package_kind", type: "package_kind", required: true },
      { key: "price", type: "number", required: true },
      { key: "benefits", type: "benefits", required: true },
      { key: "sort_order", type: "number", required: true },
      { key: "status", type: "status" },
    ],
  },
  package_gallery: {
    table: "package_gallery",
    permission: "package_gallery",
    sort: "sort_order",
    columns: [
      "name",
      "category_name",
      "subcategory_name",
      "status",
      "sort_order",
    ],
    fields: [
      { key: "name", type: "text", required: true, max: 150 },
      { key: "category_id", type: "package_category", required: true },
      { key: "subcategory_id", type: "package_subcategory" },
      { key: "photo_media_id", type: "image", required: true },
      { key: "caption", type: "textarea", max: 1000 },
      { key: "sort_order", type: "number", required: true },
      { key: "status", type: "status" },
    ],
  },

  events: {
    table: "events",
    permission: "events",
    sort: "sort_order",
    columns: ["name", "sort_order"],
    fields: [
      { key: "name", type: "text", required: true, max: 150 },
      { key: "sort_order", type: "number", required: true },
    ],
  },
  positions: {
    table: "positions",
    permission: "positions",
    sort: "sort_order",
    columns: ["name", "sort_order"],
    fields: [
      { key: "name", type: "text", required: true, max: 150 },
      { key: "sort_order", type: "number", required: true },
    ],
  },
  users: {
    table: "users",
    permission: "users",
    sort: "name",
    adminOnly: true,
    columns: ["name", "email", "role_id", "is_active"],
    fields: [
      { key: "name", type: "text", required: true, max: 150 },
      {
        key: "email",
        type: "email",
        required: true,
        max: 254,
        createOnly: true,
      },
      { key: "auth_user_id", type: "text", max: 36, createOnly: true },
      { key: "phone", type: "text", max: 20 },
      { key: "role_id", type: "role", required: true },
      { key: "is_active", type: "checkbox" },
    ],
  },
  roles: {
    table: "roles",
    permission: "roles",
    sort: "name",
    adminOnly: true,
    columns: ["name", "code", "is_active"],
    fields: [
      { key: "name", type: "text", required: true, max: 100 },
      { key: "code", type: "text", required: true, max: 50 },
      { key: "description", type: "textarea", max: 500 },
      { key: "is_active", type: "checkbox" },
    ],
  },
  permissions: {
    table: "permissions",
    permission: "permissions",
    sort: "code",
    adminOnly: true,
    columns: ["name", "code", "module"],
    fields: [
      { key: "name", type: "text", required: true, max: 100 },
      { key: "code", type: "text", required: true, max: 100 },
      { key: "module", type: "text", required: true, max: 50 },
      { key: "description", type: "textarea", max: 500 },
    ],
  },
  services: {
    table: "services",
    permission: "services",
    sort: "sort_order",
    columns: ["title", "slug", "status", "sort_order"],
    fields: [
      { key: "title", type: "text", required: true, max: 150 },
      { key: "slug", type: "text", required: true, max: 160 },
      { key: "summary", type: "textarea", required: true, max: 500 },
      { key: "description", type: "textarea", required: true, max: 10000 },
      { key: "highlight", type: "textarea", max: 300 },
      { key: "image_media_id", type: "image" },
      { key: "sort_order", type: "number", required: true },
      { key: "status", type: "status" },
    ],
  },
  clients: {
    table: "testimonials",
    permission: "testimonials",
    sort: "sort_order",
    columns: ["couple_name", "event_name", "venue", "status", "sort_order"],
    fields: [
      { key: "couple_name", type: "text", required: true, max: 200 },
      { key: "event_id", type: "event", required: true },
      { key: "crew_assignments", type: "crew_assignments" },
      { key: "venue", type: "text", required: true, max: 200 },
      { key: "excerpt", type: "textarea", required: true, max: 1000 },
      { key: "full_review", type: "textarea", max: 10000 },
      { key: "photo_media_id", type: "image" },
      { key: "video_media_id", type: "video" },
      { key: "publication_consent", type: "checkbox" },
      { key: "sort_order", type: "number", required: true },
      { key: "status", type: "status" },
    ],
  },
  website: {
    table: "site_settings",
    permission: "site_settings",
    sort: "created_at",
    singleton: true,
    columns: ["brand_name", "hero_title", "status"],
    fields: [
      { key: "brand_name", type: "text", required: true, max: 150 },
      { key: "logo_media_id", type: "image" },
      { key: "hero_title", type: "text", required: true, max: 200 },
      { key: "hero_subtitle", type: "textarea", required: true, max: 300 },
      { key: "film_title", type: "textarea", max: 300 },
      { key: "hero_poster_id", type: "image" },
      { key: "hero_video_id", type: "video" },
      { key: "contact_email", type: "email", required: true, max: 254 },
      { key: "whatsapp_contacts", type: "contacts" },
      { key: "package_inquiry_template", type: "textarea", max: 4000 },
      { key: "copyright_start_year", type: "number", required: true },
      { key: "status", type: "status" },
    ],
  },
};
export const moduleCodes = Object.keys(modules) as ModuleCode[];
export function isModuleCode(code: string): code is ModuleCode {
  return Object.hasOwn(modules, code);
}
export function emptyValues(module: ModuleCode): AdminValues {
  return Object.fromEntries(
    modules[module].fields.map((field) => [
      field.key,
      ["contacts", "benefits", "crew_assignments"].includes(field.type)
        ? []
        : field.type === "checkbox"
          ? field.key === "is_active"
          : field.type === "number"
            ? field.key === "copyright_start_year"
              ? new Date().getFullYear()
              : 0
            : field.type === "status"
              ? "draft"
              : field.type === "package_kind"
                ? "all_in"
                : ["image", "video"].includes(field.type)
                  ? null
                  : "",
    ]),
  );
}
export function serviceSlug(title: unknown): string {
  return (
    (typeof title === "string" ? title : "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 145)
      .replace(/-+$/g, "") || "service"
  );
}
function automaticSlug(value: AdminValues, editing: boolean) {
  // Keep an existing slug on edits unless the title field generated a new one.
  return editing && typeof value.slug === "string" && value.slug.trim()
    ? value.slug.trim()
    : serviceSlug(value.title);
}
export function validateAdminValues(
  module: ModuleCode,
  value: AdminValues,
  editing = false,
): Record<string, string> {
  if (module === "services")
    value = { ...value, slug: automaticSlug(value, editing) };
  const errors: Record<string, string> = {};
  if (
    module === "website" &&
    !validInquiryTemplate(value.package_inquiry_template)
  )
    errors.package_inquiry_template = "inquiryTemplate";
  for (const field of modules[module].fields) {
    if (editing && field.createOnly) continue;
    const item = value[field.key];
    if (field.type === "crew_assignments") {
      const uuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!Array.isArray(item) || item.length > 50)
        errors[field.key] = "crewAssignments";
      else {
        const ids = new Set<string>(),
          crews = new Set<string>();
        for (const row of item as CrewAssignment[]) {
          if (
            !row ||
            typeof row !== "object" ||
            ![row.id, row.crew_id, row.position_id].every(
              (value) => typeof value === "string" && uuid.test(value),
            ) ||
            ids.has(row.id) ||
            crews.has(row.crew_id) ||
            [row.photo_media_id, row.video_media_id].some(
              (value) =>
                value !== null &&
                (typeof value !== "string" || !uuid.test(value)),
            )
          )
            errors[field.key] = "crewAssignments";
          ids.add(row?.id);
          crews.add(row?.crew_id);
        }
      }
      continue;
    }
    if (field.type === "benefits") {
      if (
        !Array.isArray(item) ||
        !item.length ||
        item.length > 50 ||
        item.some(
          (row) =>
            typeof row !== "string" || !row.trim() || row.trim().length > 500,
        )
      )
        errors[field.key] = "benefits";
      continue;
    }
    if (
      field.type === "package_kind" &&
      !["all_in", "non_venue"].includes(String(item))
    )
      errors[field.key] = "invalid";
    if (field.type === "contacts") {
      if (!validWhatsAppContacts(item)) errors[field.key] = "contacts";
      continue;
    }
    if (field.type === "checkbox") {
      if (typeof item !== "boolean") errors[field.key] = "invalid";
      continue;
    }
    if (field.type === "number") {
      if (
        typeof item !== "number" ||
        !Number.isSafeInteger(item) ||
        item < 0 ||
        item > (field.key === "price" ? 999999999999 : 2147483647)
      )
        errors[field.key] = "invalid";
      continue;
    }
    if (field.required && (typeof item !== "string" || !item.trim())) {
      errors[field.key] = "required";
      continue;
    }
    if (item !== null && item !== undefined && typeof item !== "string") {
      errors[field.key] = "invalid";
      continue;
    }
    if (typeof item === "string" && field.max && item.trim().length > field.max)
      errors[field.key] = "tooLong";
    if (
      typeof item === "string" &&
      item &&
      field.type === "email" &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item)
    )
      errors[field.key] = "invalid";
    if (
      [
        "role",
        "image",
        "video",
        "event",
        "package_category",
        "package_subcategory",
      ].includes(field.type) &&
      item &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        String(item),
      )
    )
      errors[field.key] = "invalid";
    if (
      field.key === "auth_user_id" &&
      item &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        String(item),
      )
    )
      errors[field.key] = "invalid";
    if (
      field.type === "status" &&
      !["draft", "published"].includes(String(item))
    )
      errors[field.key] = "invalid";
  }
  if (module === "roles" && !/^[a-z][a-z0-9_]*$/.test(String(value.code || "")))
    errors.code = "invalid";
  if (
    module === "permissions" &&
    !/^[a-z_]+\.[a-z_]+$/.test(String(value.code || ""))
  )
    errors.code = "invalid";
  if (
    module === "services" &&
    !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(String(value.slug || ""))
  )
    errors.slug = "invalid";
  for (const key of ["phone", "whatsapp_number"])
    if (value[key] && !/^\+[1-9][0-9]{7,14}$/.test(String(value[key])))
      errors[key] = "invalid";
  if (
    module === "website" &&
    typeof value.copyright_start_year === "number" &&
    (value.copyright_start_year < 1900 ||
      value.copyright_start_year > new Date().getFullYear())
  )
    errors.copyright_start_year = "invalid";
  if (module === "website" && value.hero_video_id && !value.hero_poster_id)
    errors.hero_poster_id = "required";
  if (module === "clients" && value.status === "published") {
    if (!value.photo_media_id) errors.photo_media_id = "required";
    if (value.publication_consent !== true)
      errors.publication_consent = "consent";
  }
  return errors;
}
export function adminPayload(
  module: ModuleCode,
  value: AdminValues,
  editing = false,
): AdminValues {
  if (module === "services")
    value = { ...value, slug: automaticSlug(value, editing) };
  return Object.fromEntries(
    modules[module].fields
      .filter((field) => !(editing && field.createOnly))
      .map((field) => {
        const item = value[field.key];
        return [
          field.key,
          field.type === "crew_assignments" && Array.isArray(item)
            ? (item as CrewAssignment[]).map((row) => ({
                id: row.id,
                crew_id: row.crew_id,
                position_id: row.position_id,
                photo_media_id: row.photo_media_id,
                video_media_id: row.video_media_id,
              }))
            : field.type === "contacts" && Array.isArray(item)
              ? (item as WhatsAppContact[]).map((row) => ({
                  id: row.id,
                  label: row.label.trim(),
                  number: row.number,
                  message: row.message.trim(),
                  sort_order: row.sort_order,
                  is_active: row.is_active,
                }))
              : field.type === "benefits" && Array.isArray(item)
                ? (item as string[]).map((row) => row.trim())
                : typeof item === "string"
                  ? item.trim() || (!field.required ? null : "")
                  : item,
        ];
      }),
  );
}
