import { getTranslations } from "next-intl/server";
export default async function PublishedEmpty() {
  const t = await getTranslations("wedding");
  return (
    <p
      role="status"
      className="flex min-h-dvh items-center justify-center px-6 text-center text-sm"
    >
      {t("siteEmpty")}
    </p>
  );
}
