import { publicWhatsApp } from "./whatsapp";
import type { WeddingPageContent } from "./page-content";
export function publishedSections(content: WeddingPageContent) {
  const hero = Boolean(
    content.hero.hero_title ||
    content.hero.hero_subtitle ||
    content.hero.hero_poster_url ||
    content.hero.hero_video_url,
  );
  const contact = Boolean(
    content.settings?.contact_email ||
    publicWhatsApp(content.settings).length ||
    content.social_links.some(
      (link) => link.platform === "instagram" && link.url,
    ),
  );
  const ids = [
    ...(content.services.length ? ["services"] : []),
    ...(content.team_members.length ? ["crew"] : []),
    ...(content.testimonials.length ? ["stories"] : []),
    ...(contact ? ["contact"] : []),
  ];
  return {
    hero,
    contact,
    ids,
    footer: Boolean(content.settings || content.social_links.length),
    empty:
      !hero && !ids.length && !content.settings && !content.social_links.length,
  };
}
