import type { CrewErrors, CrewInput } from "./types";

export const emptyCrew: CrewInput = {
  name: "",
  role_title: "",
  is_founder: false,
  biography: "",
  photo_media_id: null,
  sort_order: 0,
  status: "draft",
};
export const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validateCrew(value: CrewInput): CrewErrors {
  const errors: CrewErrors = {};
  for (const field of ["name", "role_title", "biography"] as const) {
    if (!value[field].trim()) errors[field] = "required";
    else if (value[field].trim().length > (field === "biography" ? 2000 : 150))
      errors[field] = "tooLong";
  }
  if (
    !Number.isSafeInteger(value.sort_order) ||
    value.sort_order < 0 ||
    value.sort_order > 2147483647
  )
    errors.sort_order = "invalidOrder";
  if (!["draft", "published"].includes(value.status))
    errors.status = "invalidStatus";
  if (typeof value.is_founder !== "boolean")
    errors.is_founder = "invalidFounder";
  if (value.photo_media_id !== null && !uuidPattern.test(value.photo_media_id))
    errors.photo_media_id = "invalidPhoto";
  return errors;
}

export function crewPayload(value: CrewInput): CrewInput {
  return {
    name: value.name.trim(),
    role_title: value.role_title.trim(),
    is_founder: value.is_founder,
    biography: value.biography.trim(),
    photo_media_id: value.photo_media_id,
    sort_order: value.sort_order,
    status: value.status,
  };
}
