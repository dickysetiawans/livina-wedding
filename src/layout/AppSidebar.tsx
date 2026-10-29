"use client";
import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useSidebar } from "@/context/SidebarContext";
import {
  GridIcon,
  GroupIcon,
  UserCircleIcon,
  ListIcon,
  PageIcon,
  UserIcon,
  LockIcon,
  CheckCircleIcon,
  PlugInIcon,
} from "@/icons";

interface AppSidebarProps {
  permissions: string[];
  role: string;
}
export default function AppSidebar({ permissions, role }: AppSidebarProps) {
  const t = useTranslations("management");
  const pathname = usePathname();
  const {
    isExpanded,
    isMobileOpen,
    isHovered,
    setIsHovered,
    toggleMobileSidebar,
  } = useSidebar();
  const expanded = isExpanded || isHovered || isMobileOpen;
  const groups = [
    {
      key: "content",
      items: [
        {
          key: "crew",
          href: "/admin/crew",
          permission: "team_members.read",
          Icon: GroupIcon,
        },
        {
          key: "clients",
          href: "/admin/clients",
          permission: "testimonials.read",
          Icon: UserCircleIcon,
        },
        {
          key: "services",
          href: "/admin/services",
          permission: "services.read",
          Icon: ListIcon,
        },
        {
          key: "website",
          href: "/admin/website",
          permission: "site_settings.read",
          Icon: PlugInIcon,
        },
        {
          key: "templates",
          href: "/admin/templates",
          permission: "templates.read",
          Icon: PageIcon,
        },
      ],
    },
    {
      key: "access",
      items: [
        {
          key: "users",
          href: "/admin/users",
          permission: "users.read",
          Icon: UserIcon,
        },
        {
          key: "roles",
          href: "/admin/roles",
          permission: "roles.read",
          Icon: LockIcon,
        },
        {
          key: "permissions",
          href: "/admin/permissions",
          permission: "permissions.read",
          Icon: CheckCircleIcon,
        },
        {
          key: "rolePermissions",
          href: "/admin/role-permissions",
          permission: "role_permissions.read",
          Icon: GridIcon,
        },
      ],
    },
  ];
  const close = () => {
    if (isMobileOpen) toggleMobileSidebar();
  };
  return (
    <aside
      onMouseEnter={() => {
        if (!isExpanded) setIsHovered(true);
      }}
      onMouseLeave={() => setIsHovered(false)}
      className={`fixed start-0 top-0 z-999 flex h-dvh flex-col border-e border-gray-200 bg-white px-4 transition-all duration-300 dark:border-gray-800 dark:bg-gray-900 ${expanded ? "w-72.5" : "w-22.5"} ${isMobileOpen ? "translate-x-0" : "-translate-x-full rtl:translate-x-full"} xl:translate-x-0`}
    >
      <Link
        href="/dashboard"
        onClick={close}
        className="flex h-24 items-center justify-center border-b border-gray-100 text-xl font-semibold tracking-wide text-gray-900 dark:border-gray-800 dark:text-gray-100"
        aria-label={t("brand")}
      >
        {expanded ? t("brand") : t("brandShort")}
      </Link>
      <nav
        className="custom-scrollbar flex-1 overflow-y-auto py-6"
        aria-label={t("navigation")}
      >
        <Link
          href="/dashboard"
          onClick={close}
          title={t("dashboard")}
          className={`menu-item mb-6 ${pathname === "/dashboard" ? "menu-item-active" : "menu-item-inactive"}`}
        >
          <GridIcon className="size-6 shrink-0 fill-current" />
          {expanded && <span>{t("dashboard")}</span>}
        </Link>
        {groups.map((group) => {
          const visible = group.items.filter(
            (item) => role === "admin" || permissions.includes(item.permission),
          );
          return visible.length ? (
            <div key={group.key} className="mb-6">
              {expanded && (
                <h2 className="mb-3 px-3 text-xs font-medium tracking-wide text-gray-400 uppercase dark:text-gray-500">
                  {t(group.key)}
                </h2>
              )}
              <ul className="space-y-1">
                {visible.map(({ key, href, Icon }) => (
                  <li key={key}>
                    <Link
                      href={href}
                      onClick={close}
                      title={t(`modules.${key}`)}
                      className={`menu-item ${pathname === href ? "menu-item-active" : "menu-item-inactive"}`}
                    >
                      <Icon className="size-6 shrink-0 fill-current" />
                      {expanded && <span>{t(`modules.${key}`)}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null;
        })}
      </nav>
    </aside>
  );
}
