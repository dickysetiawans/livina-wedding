"use client";

import PendingPhotosProvider, {
  usePendingPhotos,
} from "@/components/media/PendingPhotosProvider";
import { uploadPhoto } from "@/lib/crew/client";
import { useRef, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { CrewApiError, saveCrew } from "@/lib/crew/client";
import { emptyCrew, validateCrew } from "@/lib/crew/validation";
import type { CrewErrors, CrewInput, CrewMember } from "@/lib/crew/types";
import CrewDialog from "./CrewDialog";
import CrewPhotoPicker from "./CrewPhotoPicker";

interface CrewEditorProps {
  preview?: boolean;
  member: CrewMember | null;
  permissions: string[];
  onClose: () => void;
  onSaved: () => void;
}
function CrewEditorForm({
  preview = false,
  member,
  permissions,
  onClose,
  onSaved,
}: CrewEditorProps) {
  const photos = usePendingPhotos();
  const t = useTranslations("crew");
  const [value, setValue] = useState<CrewInput>(() =>
    member
      ? {
          name: member.name,
          role_title: member.role_title,
          is_founder: member.is_founder ?? false,
          biography: member.biography,
          photo_media_id: member.photo_media_id,
          sort_order: member.sort_order,
          status: member.status,
        }
      : { ...emptyCrew },
  );
  const [errors, setErrors] = useState<CrewErrors>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [mediaBusy, setMediaBusy] = useState(false);
  const saving = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const canPublish = permissions.includes("team_members.publish");
  function change<K extends keyof CrewInput>(field: K, next: CrewInput[K]) {
    setValue((current) => ({ ...current, [field]: next }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving.current || mediaBusy) return;
    const nextErrors = validateCrew(value);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      const first = Object.keys(nextErrors)[0];
      formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    if (preview) return;
    saving.current = true;
    setBusy(true);
    setError("");
    try {
      const prepared = await photos.prepare({ ...value }, uploadPhoto);
      await saveCrew(prepared, member?.id);
      onSaved();
    } catch (error) {
      setError(error instanceof CrewApiError ? error.code : "network");
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  const selectClass =
    "h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 focus-visible:outline-brand-500 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100";
  return (
    <CrewDialog
      title={t(member ? "edit" : "add")}
      onClose={onClose}
      busy={busy || mediaBusy}
      size="form"
    >
      <form ref={formRef} onSubmit={submit} noValidate className="space-y-5">
        {preview && (
          <p
            role="status"
            className="text-sm text-warning-700 dark:text-warning-400"
          >
            {t("previewHint")}
          </p>
        )}
        <fieldset
          disabled={busy}
          className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-2"
        >
          <div>
            <Label htmlFor="crew-name">{t("name")} *</Label>
            <Input
              id="crew-name"
              name="name"
              value={value.name}
              maxLength={150}
              onChange={(event) => change("name", event.target.value)}
              required
              error={Boolean(errors.name)}
              hint={
                errors.name ? t(`validation.${errors.name}`) : t("nameHint")
              }
              aria-invalid={Boolean(errors.name)}
            />
          </div>
          <div>
            <Label htmlFor="crew-role">{t("role")} *</Label>
            <Input
              id="crew-role"
              name="role_title"
              value={value.role_title}
              maxLength={150}
              onChange={(event) => change("role_title", event.target.value)}
              required
              error={Boolean(errors.role_title)}
              hint={
                errors.role_title
                  ? t(`validation.${errors.role_title}`)
                  : t("roleHint")
              }
              aria-invalid={Boolean(errors.role_title)}
            />
          </div>
          <div className="lg:col-span-2">
            <label className="mb-5 flex items-start gap-3 text-sm text-gray-700 dark:text-gray-200">
              <input
                name="is_founder"
                type="checkbox"
                checked={value.is_founder}
                onChange={(event) => change("is_founder", event.target.checked)}
                className="mt-1 size-4 accent-brand-500"
              />
              <span>
                {t("isFounder")}
                <small className="block text-xs text-gray-500 dark:text-gray-400">
                  {t("founderHint")}
                </small>
              </span>
            </label>
            {errors.is_founder && (
              <p
                role="alert"
                className="mb-3 text-xs text-error-600 dark:text-error-400"
              >
                {t(`validation.${errors.is_founder}`)}
              </p>
            )}
            <Label htmlFor="crew-biography">{t("biography")} *</Label>
            <textarea
              id="crew-biography"
              name="biography"
              value={value.biography}
              onChange={(event) => change("biography", event.target.value)}
              required
              maxLength={2000}
              rows={5}
              aria-invalid={Boolean(errors.biography)}
              aria-describedby="crew-biography-hint"
              className={`${selectClass} h-auto py-3`}
            />
            <p
              id="crew-biography-hint"
              className={`mt-1 text-xs ${errors.biography ? "text-error-600 dark:text-error-400" : "text-gray-500 dark:text-gray-400"}`}
            >
              {errors.biography
                ? t(`validation.${errors.biography}`)
                : t("biographyHint")}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <Label htmlFor="crew-order">{t("order")} *</Label>
              <Input
                id="crew-order"
                name="sort_order"
                type="number"
                min={0}
                max={2147483647}
                step={1}
                value={Number.isNaN(value.sort_order) ? "" : value.sort_order}
                onChange={(event) =>
                  change(
                    "sort_order",
                    event.target.value === ""
                      ? NaN
                      : Number(event.target.value),
                  )
                }
                error={Boolean(errors.sort_order)}
                hint={
                  errors.sort_order
                    ? t(`validation.${errors.sort_order}`)
                    : t("orderHint")
                }
              />
            </div>
            <div>
              <Label htmlFor="crew-status">{t("status")}</Label>
              <select
                id="crew-status"
                name="status"
                value={value.status}
                disabled={!canPublish}
                onChange={(event) =>
                  change("status", event.target.value as CrewInput["status"])
                }
                className={selectClass}
              >
                <option value="draft">{t("draft")}</option>
                <option value="published">{t("published")}</option>
              </select>
            </div>
          </div>
          {permissions.includes("media.read") && (
            <div className="min-w-0">
              <CrewPhotoPicker
                value={value.photo_media_id}
                name={value.name}
                canUpload={permissions.includes("media.create")}
                disabled={busy || preview}
                onChange={(id) => change("photo_media_id", id)}
                onBusyChange={setMediaBusy}
                cropAspect={3 / 4}
              />
            </div>
          )}
          <p className="text-xs text-gray-500 lg:col-span-2 dark:text-gray-400">
            {t("publicationHint")}
          </p>
        </fieldset>
        {error && (
          <p
            role="alert"
            className="text-sm text-error-600 dark:text-error-400"
          >
            {t(`errors.${error}`)}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={busy || mediaBusy}
          >
            {t("cancel")}
          </Button>
          <Button type="submit" disabled={busy || mediaBusy || preview}>
            {t(busy ? "saving" : "save")}
          </Button>
        </div>
      </form>
    </CrewDialog>
  );
}

export default function CrewEditor(props: CrewEditorProps) {
  return (
    <PendingPhotosProvider>
      <CrewEditorForm {...props} />
    </PendingPhotosProvider>
  );
}
