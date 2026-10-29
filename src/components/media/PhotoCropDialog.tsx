"use client";
/* eslint-disable @next/next/no-img-element -- Local image pixels are used by the crop canvas. */
import {
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type KeyboardEvent,
} from "react";
import { useTranslations } from "next-intl";
import CrewDialog from "@/components/crew/CrewDialog";
import Button from "@/components/ui/button/Button";
import { cropGeometry, exportCrop } from "@/lib/media/crop";

interface PhotoCropDialogProps {
  file: File;
  aspect: number;
  onClose: () => void;
  onUse: (file: File) => void;
}
export default function PhotoCropDialog({
  file,
  aspect,
  onClose,
  onUse,
}: PhotoCropDialogProps) {
  const t = useTranslations("mediaUpload");
  const frame = useRef<HTMLDivElement>(null);
  const [image, setImage] = useState<{
    element: HTMLImageElement;
    src: string;
  } | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const drag = useRef<{
    id: number;
    x: number;
    y: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const lock = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    const src = URL.createObjectURL(file),
      element = new window.Image();
    element.onload = () => {
      if (mounted.current) {
        if (element.naturalWidth && element.naturalHeight)
          setImage({ element, src });
        else setError(true);
      }
    };
    element.onerror = () => {
      if (mounted.current) setError(true);
    };
    element.src = src;
    return () => {
      mounted.current = false;
      element.onload = null;
      element.onerror = null;
      URL.revokeObjectURL(src);
    };
  }, [file]);
  useEffect(() => {
    if (!frame.current) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) setSize({ width: rect.width, height: rect.height });
    });
    observer.observe(frame.current);
    return () => observer.disconnect();
  }, []);
  const input =
    image && size.width && size.height
      ? {
          imageWidth: image.element.naturalWidth,
          imageHeight: image.element.naturalHeight,
          frameWidth: size.width,
          frameHeight: size.height,
          zoom,
          ...offset,
        }
      : null;
  const geometry = input ? cropGeometry(input) : null;
  function move(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current || drag.current.id !== event.pointerId || !input) return;
    const next = cropGeometry({
      ...input,
      x: drag.current.offsetX + event.clientX - drag.current.x,
      y: drag.current.offsetY + event.clientY - drag.current.y,
    });
    setOffset({ x: next.x, y: next.y });
  }
  function keyboard(event: KeyboardEvent<HTMLDivElement>) {
    if (
      !input ||
      !geometry ||
      !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
    )
      return;
    event.preventDefault();
    const step = event.shiftKey ? 20 : 5;
    const next = cropGeometry({
      ...input,
      x:
        geometry.x +
        (event.key === "ArrowLeft"
          ? -step
          : event.key === "ArrowRight"
            ? step
            : 0),
      y:
        geometry.y +
        (event.key === "ArrowUp"
          ? -step
          : event.key === "ArrowDown"
            ? step
            : 0),
    });
    setOffset({ x: next.x, y: next.y });
  }
  async function usePhoto() {
    if (!image || !input || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(false);
    try {
      const cropped = await exportCrop(image.element, input, file.name);
      if (mounted.current) onUse(cropped);
    } catch {
      if (mounted.current) setError(true);
    } finally {
      lock.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  return (
    <CrewDialog title={t("cropTitle")} busy={busy} onClose={onClose}>
      <div className="space-y-6">
        <p className="text-sm leading-6 text-gray-500 dark:text-gray-400">
          {t("cropHint")}
        </p>
        <div
          ref={frame}
          dir="ltr"
          role="group"
          tabIndex={0}
          aria-label={t("cropPosition")}
          aria-busy={!image}
          onKeyDown={keyboard}
          onPointerDown={(event) => {
            if (!geometry || busy || drag.current) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            drag.current = {
              id: event.pointerId,
              x: event.clientX,
              y: event.clientY,
              offsetX: geometry.x,
              offsetY: geometry.y,
            };
          }}
          onPointerMove={move}
          onPointerUp={() => {
            drag.current = null;
          }}
          onPointerCancel={() => {
            drag.current = null;
          }}
          className="relative mx-auto w-full max-w-sm touch-none overflow-hidden rounded-2xl bg-gray-100 outline-offset-4 focus-visible:outline-2 focus-visible:outline-brand-500 dark:bg-gray-800"
          style={{ aspectRatio: aspect, cursor: busy ? "wait" : "grab" }}
        >
          {image && geometry && (
            <img
              src={image.src}
              alt=""
              draggable={false}
              className="pointer-events-none absolute max-w-none select-none"
              style={{
                width: input!.imageWidth * geometry.scale,
                height: input!.imageHeight * geometry.scale,
                insetInlineStart: "50%",
                top: "50%",
                transform: `translate(-50%, -50%) translate(${geometry.x}px, ${geometry.y}px)`,
              }}
            />
          )}
        </div>
        <label className="flex items-center gap-4 text-sm text-gray-700 dark:text-gray-200">
          <span>{t("zoom")}</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            disabled={!image || busy}
            onChange={(event) => {
              const nextZoom = Number(event.target.value);
              setZoom(nextZoom);
              if (input) {
                const next = cropGeometry({ ...input, zoom: nextZoom });
                setOffset({ x: next.x, y: next.y });
              }
            }}
            className="min-w-0 flex-1 accent-brand-500"
          />
        </label>
        {error && (
          <p
            role="alert"
            className="text-sm text-error-600 dark:text-error-400"
          >
            {t("cropError")}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={busy}
          >
            {t("cancel")}
          </Button>
          <Button
            type="button"
            onClick={usePhoto}
            disabled={!image || !geometry || busy}
          >
            {t(busy ? "preparing" : "usePhoto")}
          </Button>
        </div>
      </div>
    </CrewDialog>
  );
}
