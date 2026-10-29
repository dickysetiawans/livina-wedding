"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import CrewSignIn from "@/components/crew/CrewSignIn";
import { clearSession, configured, context } from "@/lib/crew/client";

export default function AdminLogin() {
  const t = useTranslations("admin");
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  useEffect(() => {
    clearSession();
    let active = true;
    context()
      .then((session) => {
        if (active && session) {
          router.replace("/dashboard");
          router.refresh();
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => {
      active = false;
    };
  }, [router]);
  return (
    <div
      lang="id"
      className="grid min-h-dvh bg-gray-50 lg:grid-cols-2 dark:bg-gray-950"
    >
      <aside className="hidden flex-col justify-between bg-gray-950 p-12 text-white lg:flex dark:bg-gray-900">
        <Link href="/" className="font-editorial text-2xl">
          {t("brand")}
        </Link>
        <div>
          <p className="mb-5 text-sm tracking-widest text-gray-400 uppercase">
            {t("privateArea")}
          </p>
          <h1 className="font-editorial text-title-xl leading-tight">
            {t("loginHeadline")}
          </h1>
        </div>
        <p className="text-sm text-gray-400">{t("loginDescription")}</p>
      </aside>
      <main className="flex min-w-0 flex-col justify-center p-5 sm:p-12">
        <div className="mx-auto w-full max-w-lg space-y-7">
          <Link href="/" className="text-sm text-gray-500 dark:text-gray-400">
            {t("back")}
          </Link>
          {checking ? (
            <p role="status" className="text-gray-500 dark:text-gray-400">
              {t("checking")}
            </p>
          ) : (
            <>
              <CrewSignIn
                onSignedIn={() => {
                  router.replace("/dashboard");
                  router.refresh();
                }}
              />
              {!configured && (
                <p
                  role="status"
                  className="text-sm text-warning-700 dark:text-warning-400"
                >
                  {t("configuration")}
                </p>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
