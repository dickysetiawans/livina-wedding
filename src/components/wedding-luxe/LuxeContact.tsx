import { publicWhatsApp } from "@/lib/wedding/whatsapp";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowUpIcon, ArrowRightIcon } from "@/icons";
import type { WeddingContent } from "@/lib/wedding/content";
import styles from "./Luxe.module.css";

export default async function LuxeContact({
  content,
}: {
  content: WeddingContent;
}) {
  const t = await getTranslations("wedding");
  const l = await getTranslations("luxe");
  const settings = content.settings;
  const instagram = content.social_links.find(
    (link) => link.platform === "instagram",
  );
  const contacts = [
    {
      label: t("email"),
      value: settings?.contact_email,
      href: settings?.contact_email ? `mailto:${settings.contact_email}` : null,
    },
    ...publicWhatsApp(settings).map((row) => ({
      key: row.id,
      label: row.label,
      value: row.number,
      href: row.href,
    })),
    { label: t("instagram"), value: instagram?.label, href: instagram?.url },
  ].filter((item) => item.href);
  return (
    <>
      {contacts.length > 0 && (
        <section
          id="contact"
          className={styles.contact}
          aria-labelledby="luxe-contact-title"
        >
          <div data-luxe-reveal className={styles.contactTop}>
            <span className={styles.eyebrow}>{l("contactEyebrow")}</span>
            <h2 id="luxe-contact-title">{t("contact")}</h2>
          </div>
          <div className={styles.contactGrid}>
            {contacts.map((item) => (
              <div
                key={"key" in item ? String(item.key) : item.label}
                data-luxe-reveal
              >
                <span className={styles.eyebrow}>{item.label}</span>
                {item.href ? (
                  <a
                    href={item.href}
                    target={
                      item.href.startsWith("https:") ? "_blank" : undefined
                    }
                    rel="noopener noreferrer"
                  >
                    {item.value}
                    <ArrowRightIcon className="size-5 rtl:rotate-180" />
                  </a>
                ) : (
                  <p>{t("contactPending")}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
      <footer
        className={`${styles.footer} bg-luxe-espresso px-6 text-luxe-ivory dark:bg-luxe-espresso dark:text-luxe-ivory`}
      >
        <p>
          {settings?.copyright_start_year || new Date().getFullYear()} ©{" "}
          {settings?.brand_name || t("brand")}. {t("rights")}
        </p>
        <div>
          {content.social_links.map((link) => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {link.label}
            </a>
          ))}
          <Link href="/admin">{t("admin")}</Link>
          <a href="#top" aria-label={t("backTop")}>
            <ArrowUpIcon className="size-5" />
          </a>
        </div>
      </footer>
    </>
  );
}
