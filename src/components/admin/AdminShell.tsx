"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useSidebar } from "@/context/SidebarContext";
import { Link, useRouter } from "@/i18n/navigation";
import { GridIcon } from "@/icons";
import { ThemeToggleButton } from "@/components/common/ThemeToggleButton";
import Button from "@/components/ui/button/Button";
import { logout } from "@/lib/crew/client";
import type { SessionContext } from "@/lib/crew/types";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";
import { useModal } from "@/hooks/useModal";
import PasswordDialog from "./PasswordDialog";

interface AdminShellProps {
  children: React.ReactNode;
  user: SessionContext["user"];
  permissions: string[];
}
export default function AdminShell({
  children,
  user,
  permissions,
}: AdminShellProps) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const passwordModal = useModal();
  const passwords = useTranslations("passwords");
  const {
    isExpanded,
    isHovered,
    isMobileOpen,
    toggleSidebar,
    toggleMobileSidebar,
  } = useSidebar();
  async function signOut() {
    if (busy) return;
    setBusy(true);
    setError(false);
    try {
      await logout();
      router.replace("/admin");
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="min-h-dvh bg-gray-50 dark:bg-gray-900">
      <AppSidebar permissions={permissions} role={user.role} />
      <Backdrop />
      <div
        className={`min-w-0 transition-all duration-300 ${isExpanded || isHovered ? "xl:ms-72.5" : "xl:ms-22.5"}`}
      >
        <header className="sticky top-0 z-99 flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <button
            type="button"
            aria-label={t("menu")}
            aria-expanded={isMobileOpen || isExpanded}
            onClick={() =>
              window.innerWidth >= 1280
                ? toggleSidebar()
                : toggleMobileSidebar()
            }
            className="rounded-lg border border-gray-200 p-3 text-gray-600 dark:border-gray-700 dark:text-gray-300"
          >
            <GridIcon className="size-5 fill-current" />
          </button>
          <div className="ms-auto flex flex-wrap items-center gap-3">
            <Link href="/" className="text-sm text-gray-500 dark:text-gray-400">
              {t("website")}
            </Link>
            <ThemeToggleButton />
            <span className="max-w-40 truncate text-sm text-gray-700 dark:text-gray-200">
              {user.name}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={passwordModal.openModal}
            >
              {passwords("changeTitle")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={signOut}
            >
              {t("logout")}
            </Button>
          </div>
        </header>
        <main className="mx-auto max-w-(--breakpoint-2xl) p-4 md:p-6">
          {error && (
            <p
              role="alert"
              className="mb-4 text-sm text-error-600 dark:text-error-400"
            >
              {t("logoutError")}
            </p>
          )}
          {children}
        </main>
      </div>
      {passwordModal.isOpen && (
        <PasswordDialog
          onClose={passwordModal.closeModal}
          onChanged={() => {
            passwordModal.closeModal();
            router.replace("/admin");
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
