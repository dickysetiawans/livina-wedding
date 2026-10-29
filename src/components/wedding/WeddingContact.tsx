import { publicWhatsApp } from "@/lib/wedding/whatsapp";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { EnvelopeIcon, ChatIcon, UserCircleIcon, ArrowUpIcon } from "@/icons";
import type { WeddingContent } from "@/lib/wedding/content";
import styles from "./Wedding.module.css";

interface WeddingContactProps {
  content: WeddingContent;
}
export default async function WeddingContact({ content }: WeddingContactProps) {
  const t = await getTranslations("wedding");
  const settings = content.settings;
  const instagram = content.social_links.find(
    (link) => link.platform === "instagram",
  );
  const items = [
    {
      label: t("email"),
      value: settings?.contact_email,
      href: settings?.contact_email ? `mailto:${settings.contact_email}` : null,
      Icon: EnvelopeIcon,
    },
    ...publicWhatsApp(settings).map((row) => ({
      key: row.id,
      label: row.label,
      value: row.number,
      href: row.href,
      Icon: ChatIcon,
    })),
    {
      label: t("instagram"),
      value: instagram?.label,
      href: instagram?.url || null,
      Icon: UserCircleIcon,
    },
  ].filter((item) => item.href);
  return (
    <>
      {items.length > 0 && (
        <section
          id="contact"
          className={styles.contact}
          aria-label={t("contact")}
        >
          {items.map(({ label, value, href, Icon, ...item }) => (
            <div
              key={"key" in item ? String(item.key) : label}
              data-reveal
              className={styles.contactItem}
            >
              <Icon className="size-7 fill-current" />
              {href ? (
                <a
                  href={href}
                  target={href.startsWith("https:") ? "_blank" : undefined}
                  rel="noopener noreferrer"
                >
                  {value}
                </a>
              ) : (
                <span>{t("contactPending")}</span>
              )}
              <p>{label}</p>
            </div>
          ))}
        </section>
      )}
      <footer className={styles.footer}>
        <p>
          {settings?.copyright_start_year || new Date().getFullYear()} ©{" "}
          {settings?.brand_name || t("brand")}. {t("rights")}
        </p>
        <div className={styles.footerLinks}>
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
          <a href="#top" aria-label={t("backTop")} className={styles.backTop}>
            <ArrowUpIcon className="size-5 fill-current" />
          </a>
        </div>
      </footer>
    </>
  );
}
