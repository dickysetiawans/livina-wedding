export interface CrewMember {
  id: string;
  name: string;
  role_title: string;
  is_founder: boolean;
  biography: string;
  photo_media_id: string | null;
  sort_order: number;
  status: "draft" | "published";
  created_at: string;
  updated_at: string;
}

export type CrewInput = Pick<
  CrewMember,
  | "name"
  | "role_title"
  | "is_founder"
  | "biography"
  | "photo_media_id"
  | "sort_order"
  | "status"
>;
export type CrewErrors = Partial<Record<keyof CrewInput, string>>;
export interface ListMeta {
  page: number;
  per_page: number;
  total_data: number;
  total_pages: number;
  has_previous_page: boolean;
  has_next_page: boolean;
}
export interface ListResult<T> {
  data: T[];
  meta: ListMeta;
}
export interface CrewQuery {
  page: number;
  perPage: number;
  search: string;
  status: "" | "draft" | "published";
  sort: "sort_order" | "name" | "created_at";
  direction: "asc" | "desc";
}
export interface MediaFile {
  id: string;
  original_name: string;
  status: "pending" | "processing" | "ready" | "failed";
  alt_text: string | null;
  kind: "image" | "video";
}
export interface SessionContext {
  user: { id: string; name: string; email: string; role: string };
  permissions: string[];
}
export interface PublicCrewMember {
  id: string;
  name: string;
  role_title: string;
  biography: string;
  photo_media_id: string | null;
  is_founder?: boolean;
  sort_order?: number;
}
