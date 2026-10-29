"use client";
import PendingPhotosProvider, {
  usePendingPhotos,
} from "@/components/media/PendingPhotosProvider";
import { uploadPhoto, uploadVideo, CrewApiError } from "@/lib/crew/client";
import { useRef, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import CrewDialog from "@/components/crew/CrewDialog";
import Button from "@/components/ui/button/Button";
import {
  modules,
  serviceSlug,
  emptyValues,
  validateAdminValues,
  type AdminRecord,
  type AdminValues,
  type ModuleCode,
  type AdminValue,
} from "@/lib/admin/modules";
import { AdminApiError, saveAdmin } from "@/lib/admin/client";
import AdminFieldControl from "./AdminFieldControl";

interface AdminEditorProps {
  inline?: boolean;
  readOnly?: boolean;
  module: ModuleCode;
  record: AdminRecord | null;
  roles: AdminRecord[];
  permissions: string[];
  onClose: () => void;
  onSaved: () => void;
}
function AdminEditorForm({
  inline = false,
  readOnly = false,
  module,
  record,
  roles,
  permissions,
  onClose,
  onSaved,
}: AdminEditorProps) {
  const photos = usePendingPhotos();
  const t = useTranslations("management");
  const w = useTranslations("websiteSettings");
  const sections: Record<string, string> = {
    brand_name: "identity",
    film_title: "film",
    contact_email: "contact",
    status: "publication",
  };
  const [value, setValue] = useState<AdminValues>(() => ({
    ...emptyValues(module),
    ...record,
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploads, setUploads] = useState<Record<string, boolean>>({});
  const mediaBusy = Object.values(uploads).some(Boolean);
  const locked = useRef(false);
  const form = useRef<HTMLFormElement>(null);
  const definition = modules[module];
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (readOnly || locked.current || mediaBusy) return;
    const issues = validateAdminValues(module, value, Boolean(record));
    setErrors(issues);
    if (Object.keys(issues).length) {
      form.current
        ?.querySelector<HTMLElement>(`[name="${Object.keys(issues)[0]}"]`)
        ?.focus();
      return;
    }
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      const prepared = await photos.prepare(value, uploadPhoto, uploadVideo);
      await saveAdmin(module, prepared, record?.id);
      onSaved();
    } catch (error) {
      setError(
        error instanceof AdminApiError || error instanceof CrewApiError
          ? error.code
          : "network",
      );
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  function change(key: string, next: AdminValue) {
    setValue((current) => ({
      ...current,
      [key]: next,
      ...(module === "services" && key === "title"
        ? { slug: serviceSlug(next) }
        : {}),
    }));
    setErrors((current) => ({ ...current, [key]: "" }));
  }
  const content = (
    <form ref={form} onSubmit={submit} noValidate className="space-y-5">
      {module === "users" && !record && (
        <p className="rounded-lg bg-brand-50 p-3 text-sm text-brand-700 dark:bg-brand-950 dark:text-brand-200">
          {t("inviteHint")}
        </p>
      )}
      <fieldset
        disabled={busy || readOnly}
        className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-2"
      >
        {definition.fields
          .filter(
            (field) =>
              (!record || field.key !== "auth_user_id") &&
              !(module === "services" && field.key === "slug"),
          )
          .map((field) => (
            <div
              key={field.key}
              className={
                field.type === "textarea" ||
                field.type === "checkbox" ||
                field.type === "contacts" ||
                (module === "website" && Boolean(sections[field.key]))
                  ? "min-w-0 lg:col-span-2"
                  : "min-w-0"
              }
            >
              {module === "website" && sections[field.key] && (
                <h2 className="mb-4 border-b border-gray-200 pb-3 text-lg font-semibold text-gray-800 dark:border-gray-700 dark:text-gray-100">
                  {w(sections[field.key])}
                </h2>
              )}
              <AdminFieldControl
                field={field}
                value={value[field.key] ?? null}
                error={errors[field.key]}
                editing={Boolean(record)}
                disabled={
                  busy ||
                  readOnly ||
                  (module === "roles" &&
                    record?.code === "admin" &&
                    ["code", "is_active"].includes(field.key))
                }
                roles={roles}
                permissions={permissions}
                canPublish={permissions.includes(
                  `${definition.permission}.publish`,
                )}
                name={
                  field.type === "status"
                    ? definition.permission
                    : String(
                        value.name ||
                          value.title ||
                          value.couple_name ||
                          t(`modules.${module}`),
                      )
                }
                onPosterChange={
                  module === "website" && field.key === "hero_video_id"
                    ? (id) => change("hero_poster_id", id)
                    : undefined
                }
                onChange={(next) => change(field.key, next)}
                onBusyChange={(pending) =>
                  setUploads((current) =>
                    current[field.key] === pending
                      ? current
                      : { ...current, [field.key]: pending },
                  )
                }
              />
              {module === "services" && field.key === "title" && (
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {t("serviceSlugAuto", {
                    slug: String(value.slug || serviceSlug(value.title)),
                  })}
                </p>
              )}
            </div>
          ))}
      </fieldset>
      {error && (
        <p role="alert" className="text-sm text-error-600 dark:text-error-400">
          {t(`errors.${error}`)}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-3">
        {!inline && (
          <Button
            type="button"
            variant="outline"
            disabled={busy || mediaBusy}
            onClick={onClose}
          >
            {t("cancel")}
          </Button>
        )}
        <Button type="submit" disabled={readOnly || busy || mediaBusy}>
          {t(
            busy ? "saving" : module === "users" && !record ? "invite" : "save",
          )}
        </Button>
      </div>
    </form>
  );
  return inline ? (
    content
  ) : (
    <CrewDialog
      title={t(record ? "editTitle" : "addTitle", {
        module: t(`modules.${module}`),
      })}
      onClose={onClose}
      busy={busy || mediaBusy}
      size="form"
    >
      {content}
    </CrewDialog>
  );
}

export default function AdminEditor(props: AdminEditorProps) {
  return (
    <PendingPhotosProvider>
      <AdminEditorForm {...props} />
    </PendingPhotosProvider>
  );
}
