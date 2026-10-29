"use client";

import { useEffect, useId, useRef } from "react";
import { useTranslations } from "next-intl";
import { Modal } from "@/components/ui/modal";
import { CloseIcon } from "@/icons";

interface CrewDialogProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  busy?: boolean;
  size?: "default" | "form";
}
export default function CrewDialog({
  title,
  onClose,
  children,
  busy = false,
  size = "default",
}: CrewDialogProps) {
  const t = useTranslations("crew");
  const content = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    content.current?.focus();
    return () => previous?.focus();
  }, []);
  function trapFocus(event: React.KeyboardEvent) {
    if (event.defaultPrevented) return;
    if (event.key !== "Tab") return;
    const items = content.current?.querySelectorAll<HTMLElement>(
      'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], video[controls], audio[controls], [tabindex="0"]',
    );
    if (!items?.length) {
      event.preventDefault();
      return;
    }
    const first = items[0],
      last = items[items.length - 1];
    if (
      event.shiftKey &&
      (document.activeElement === first ||
        document.activeElement === content.current)
    ) {
      event.preventDefault();
      last.focus();
    } else if (
      !event.shiftKey &&
      (document.activeElement === last ||
        document.activeElement === content.current)
    ) {
      event.preventDefault();
      first.focus();
    }
  }
  return (
    <Modal
      isOpen
      onClose={() => {
        if (!busy) onClose();
      }}
      showCloseButton={false}
      className={
        size === "form" ? "mx-4 max-w-2xl lg:max-w-6xl" : "mx-4 max-w-2xl"
      }
    >
      <div
        ref={content}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-busy={busy}
        tabIndex={-1}
        onKeyDown={trapFocus}
        className="max-h-dvh overflow-y-auto p-5 outline-none sm:p-8"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <h2
            id={titleId}
            className="text-xl font-semibold text-gray-900 dark:text-white"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label={t("close")}
            className="shrink-0 rounded-lg p-2 text-gray-500 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-brand-500 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <CloseIcon className="h-5 w-5 fill-current" />
          </button>
        </div>
        {children}
      </div>
    </Modal>
  );
}
