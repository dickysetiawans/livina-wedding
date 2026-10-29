"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import Button from "@/components/ui/button/Button";
import { photoUrl } from "@/lib/crew/client";
import { usePendingPhotos } from "@/components/media/PendingPhotosProvider";
import { videoPoster } from "@/lib/media/video";

interface VideoPickerProps {
  value: string | null;
  disabled: boolean;
  canUpload: boolean;
  onChange: (id: string | null) => void;
  onPosterChange?: (id: string) => void;
  onBusyChange?: (busy: boolean) => void;
}
export default function VideoPicker({
  value,
  disabled,
  canUpload,
  onChange,
  onPosterChange,
  onBusyChange,
}: VideoPickerProps) {
  const t = useTranslations("mediaUpload"),
    photos = usePendingPhotos();
  const file = useRef<HTMLInputElement>(null),
    job = useRef<AbortController | null>(null);
  const [preview, setPreview] = useState<{ id: string; url: string } | null>(
    null,
  );
  const [local, setLocal] = useState<{ id: string; url: string } | null>(null);
  const [reading, setReading] = useState(false),
    [error, setError] = useState("");
  const busyCallback = useRef(onBusyChange);
  useEffect(() => {
    busyCallback.current = onBusyChange;
  }, [onBusyChange]);
  useEffect(
    () => () => {
      job.current?.abort();
      busyCallback.current?.(false);
    },
    [],
  );
  const localUrl = local?.url;
  useEffect(
    () => () => {
      if (localUrl) URL.revokeObjectURL(localUrl);
    },
    [localUrl],
  );
  useEffect(() => {
    if (!value || photos.file(value)) return;
    let active = true;
    const load = () => {
      void photoUrl(value)
        .then((result) => {
          if (active) setPreview({ id: value, url: result.url });
        })
        .catch(() => {});
    };
    load();
    const timer = setInterval(load, 45000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [value, photos]);
  async function select(selected: File | undefined) {
    if (!selected) return;
    job.current?.abort();
    const controller = new AbortController();
    job.current = controller;
    setError("");
    setReading(true);
    onBusyChange?.(true);
    try {
      const poster = await videoPoster(selected, controller.signal);
      if (controller.signal.aborted) return;
      const result = photos.stageVideo(selected, poster, t("videoPosterAlt"));
      setLocal({ id: result.id, url: URL.createObjectURL(selected) });
      onChange(result.id);
      onPosterChange?.(result.posterId);
    } catch (error) {
      if (!controller.signal.aborted)
        setError(
          error instanceof Error &&
            ["videoFormat", "videoLimit", "videoRead"].includes(error.message)
            ? error.message
            : "videoRead",
        );
    } finally {
      if (!controller.signal.aborted) {
        setReading(false);
        onBusyChange?.(false);
      }
    }
  }
  const src =
    local?.id === value
      ? local.url
      : preview?.id === value
        ? preview.url
        : null;
  return (
    <div className="space-y-3">
      {src && (
        <video
          controls
          playsInline
          preload="metadata"
          src={src}
          className="max-h-48 w-full rounded-xl"
        />
      )}
      <input
        ref={file}
        type="file"
        accept="video/mp4"
        tabIndex={-1}
        aria-label={t("chooseVideo")}
        className="hidden"
        onChange={(event) => {
          void select(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          size="sm"
          disabled={disabled || !canUpload || reading}
          onClick={() => file.current?.click()}
        >
          {t(value ? "changeVideo" : "chooseVideo")}
        </Button>
        {value && !reading && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              onChange(null);
              setLocal(null);
              setPreview(null);
              setError("");
            }}
            className="text-sm text-error-600 disabled:opacity-50 dark:text-error-400"
          >
            {t("remove")}
          </button>
        )}
        {reading && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              job.current?.abort();
              setReading(false);
              setError("");
              onBusyChange?.(false);
            }}
            className="text-sm text-gray-600 dark:text-gray-300"
          >
            {t("cancelSelection")}
          </button>
        )}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {t("videoHint")}
      </p>
      {!canUpload && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {t("noUpload")}
        </p>
      )}
      {reading && (
        <p role="status" className="text-sm text-brand-600 dark:text-brand-400">
          {t("videoReading")}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-error-600 dark:text-error-400">
          {t(error)}
        </p>
      )}
    </div>
  );
}
