export interface WhatsAppContact {
  id: string;
  label: string;
  number: string;
  message: string;
  sort_order: number;
  is_active: boolean;
}
export function validWhatsAppContacts(
  value: unknown,
): value is WhatsAppContact[] {
  if (!Array.isArray(value) || value.length > 50) return false;
  const ids = new Set<string>();
  return value.every((row) => {
    if (
      !row ||
      typeof row !== "object" ||
      typeof row.id !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        row.id,
      ) ||
      ids.has(row.id)
    )
      return false;
    ids.add(row.id);
    return (
      typeof row.label === "string" &&
      !!row.label.trim() &&
      row.label.trim().length <= 100 &&
      typeof row.number === "string" &&
      /^\+[1-9][0-9]{7,14}$/.test(row.number) &&
      typeof row.message === "string" &&
      row.message.length <= 1000 &&
      Number.isSafeInteger(row.sort_order) &&
      row.sort_order >= 0 &&
      row.sort_order <= 2147483647 &&
      typeof row.is_active === "boolean"
    );
  });
}
export function publicWhatsApp(
  settings: {
    whatsapp_contacts?: WhatsAppContact[];
    whatsapp_number?: string | null;
  } | null,
) {
  const rows = settings?.whatsapp_contacts;
  // Compatibility only for a project before the new migration. An explicitly
  // empty list means the admin removed every contact, so never restore it.
  if (rows !== undefined)
    return (Array.isArray(rows) ? rows : [])
      .filter((row) => row.is_active && /^\+[1-9][0-9]{7,14}$/.test(row.number))
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((row) => ({
        ...row,
        href: `https://wa.me/${row.number.slice(1)}${row.message ? `?text=${encodeURIComponent(row.message)}` : ""}`,
      }));
  return settings?.whatsapp_number
    ? [
        {
          id: "legacy",
          label: "WhatsApp",
          number: settings.whatsapp_number,
          message: "",
          sort_order: 0,
          is_active: true,
          href: `https://wa.me/${settings.whatsapp_number.replace(/\D/g, "")}`,
        },
      ]
    : [];
}
