"use client";
import { useTranslations } from "next-intl";
import { useModal } from "@/hooks/useModal";
import CrewDialog from "@/components/crew/CrewDialog";
import { packageMessage } from "@/lib/wedding/package-inquiry";
import { publicWhatsApp } from "@/lib/wedding/whatsapp";
import type { WeddingContent } from "@/lib/wedding/content";
import type { WeddingPackage, PackageCatalog } from "@/lib/wedding/packages";
import styles from "./PackageShowcase.module.css";
export default function PackageInquiry({
  item,
  catalog,
  settings,
}: {
  item: WeddingPackage;
  catalog: PackageCatalog;
  settings: WeddingContent["settings"];
}) {
  const t = useTranslations("weddingPackages"),
    modal = useModal(),
    contacts = publicWhatsApp(settings);
  const template =
    settings?.package_inquiry_template?.trim() ||
    String(t.raw("defaultMessage"));
  return (
    <>
      <button
        type="button"
        className={styles.cardAction}
        onClick={modal.openModal}
      >
        {t("askPackage")}
      </button>
      {modal.isOpen && (
        <CrewDialog title={t("chooseContact")} onClose={modal.closeModal}>
          <p className="mb-5 text-sm text-gray-600 dark:text-gray-300">
            {item.name}
          </p>
          <div className="grid gap-3">
            {contacts.map((contact) => (
              <a
                key={contact.id}
                className="rounded-xl bg-brand-50 p-4 text-sm font-medium text-brand-700 hover:bg-brand-100 focus-visible:outline-brand-500 dark:bg-brand-950 dark:text-brand-200"
                href={`https://wa.me/${contact.number.replace(/\D/g, "")}?text=${encodeURIComponent(packageMessage(template, item, catalog, contact))}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(event) => {
                  event.currentTarget.href = `https://wa.me/${contact.number.replace(/\D/g, "")}?text=${encodeURIComponent(packageMessage(template, item, catalog, contact, new Date()))}`;
                }}
              >
                {contact.label}
              </a>
            ))}
            {!contacts.length && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t("noContacts")}
              </p>
            )}
          </div>
          <p className="mt-5 text-xs text-gray-500 dark:text-gray-400">
            {t("messageHint")}
          </p>
        </CrewDialog>
      )}
    </>
  );
}
