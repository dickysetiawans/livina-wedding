"use client";
/* eslint-disable @next/next/no-img-element -- Cropped files remain local until the form is saved. */
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import Button from "@/components/ui/button/Button";
import PhotoCropDialog from "@/components/media/PhotoCropDialog";
import { usePendingPhotos } from "@/components/media/PendingPhotosProvider";
import CrewPortrait from "./CrewPortrait";

interface CrewPhotoPickerProps {
  value: string | null;
  name: string;
  canUpload: boolean;
  disabled: boolean;
  onChange: (id: string | null) => void;
  onBusyChange?: (busy: boolean) => void;
  cropAspect?: number;
}
export default function CrewPhotoPicker({
  value,
  name,
  canUpload,
  disabled,
  onChange,
  onBusyChange,
  cropAspect = 1,
}: CrewPhotoPickerProps) {
  const t = useTranslations("mediaUpload"),
    c = useTranslations("crew");
  const file = useRef<HTMLInputElement>(null);
  const [crop, setCrop] = useState<File | null>(null);
  const [local, setLocal] = useState<{ url: string; id: string | null } | null>(
    null,
  );
  const [error, setError] = useState("");
  const photos = usePendingPhotos();
  const [generated, setGenerated] = useState<{
    id: string;
    url: string;
  } | null>(null);
  const staged = photos.file(value);
  const localId = local?.id;
  useEffect(() => {
    if (!staged || !value || localId === value) return;
    let active = true;
    const url = URL.createObjectURL(staged),
      image = new window.Image();
    image.onload = () => {
      if (active) setGenerated({ id: value, url });
    };
    image.src = url;
    return () => {
      active = false;
      image.onload = null;
      URL.revokeObjectURL(url);
    };
  }, [staged, value, localId]);
  const localUrl = local?.url;
  useEffect(() => {
    return () => {
      if (localUrl) URL.revokeObjectURL(localUrl);
    };
  }, [localUrl]);
  function select(selected: File | undefined) {
    if (!selected) return;
    setError("");
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(selected.type) ||
      !selected.size ||
      selected.size > 5242880
    ) {
      setError("file");
      return;
    }
    setCrop(selected);
    onBusyChange?.(true);
  }
  function usePhoto(cropped: File) {
    const id = photos.stage(
      cropped,
      t("photoAlt", { name: name.trim() || t("photo") }),
    );
    setCrop(null);
    setLocal({ url: URL.createObjectURL(cropped), id });
    onChange(id);
    onBusyChange?.(false);
  }
  const displayed =
    local?.id === value ? local : generated?.id === value ? generated : null;
  return (
    <section aria-label={t("photo")} className="space-y-3">
      <div className="flex flex-wrap items-center gap-4">
        {displayed ? (
          <img
            src={displayed.url}
            alt={name}
            className="size-24 rounded-xl bg-gray-100 object-contain dark:bg-gray-800"
          />
        ) : staged ? (
          <div className="size-24 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
        ) : (
          <CrewPortrait id={value} name={name} className="size-24" />
        )}
        <div className="space-y-2">
          <input
            ref={file}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            tabIndex={-1}
            aria-label={t("choosePhoto")}
            className="hidden"
            onChange={(event) => {
              select(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              size="sm"
              disabled={disabled || !canUpload || !!crop}
              onClick={() => file.current?.click()}
            >
              {t(value ? "changePhoto" : "choosePhoto")}
            </Button>
            {value && (
              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  setLocal(null);
                  onChange(null);
                }}
                className="text-sm text-error-600 disabled:opacity-50 dark:text-error-400"
              >
                {t("remove")}
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t("photoHint")}
          </p>
          {!canUpload && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t("noUpload")}
            </p>
          )}
        </div>
      </div>
      {error && (
        <p role="alert" className="text-sm text-error-600 dark:text-error-400">
          {c(`errors.${error}`)}
        </p>
      )}
      {crop && (
        <PhotoCropDialog
          file={crop}
          aspect={cropAspect}
          onClose={() => {
            setCrop(null);
            onBusyChange?.(false);
          }}
          onUse={usePhoto}
        />
      )}
    </section>
  );
}
