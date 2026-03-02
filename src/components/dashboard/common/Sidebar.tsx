"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  XMarkIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  Cog6ToothIcon,
  ExclamationTriangleIcon,
  ShareIcon,
  UserGroupIcon,
  TruckIcon,
} from "@heroicons/react/24/outline";
import { useSession } from "next-auth/react";

interface NavigationItem {
  name: string;
  href?: string;
  icon: any;
  hasSubmenu?: boolean;
  submenu?: Array<{
    name: string;
    href: string;
  }>;
  allowedUserLevels?: string[];
  current?: boolean;
}

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

export function NavigationDashboard({
  sidebarOpen,
  setSidebarOpen,
}: {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const normalizeRole = (r?: string) =>
    (r ?? "admin").toString().toLowerCase().replace(/[-\s]/g, "_");

  const userRole = normalizeRole(session?.user?.role);

  const navigationConfig: NavigationItem[] = [
    {
      name: "Emergency SOS",
      href: "/dashboard/live-stream",
      icon: ExclamationTriangleIcon,
      allowedUserLevels: ["super_admin", "admin"],
    },
    {
      name: "Social Media",
      href: "/dashboard/social-media",
      icon: ShareIcon,
      allowedUserLevels: ["super_admin", "admin"],
    },
    {
      name: "Women & Children",
      href: "/dashboard/women-children",
      icon: UserGroupIcon,
      allowedUserLevels: ["super_admin", "admin"],
    },
    {
      name: "Traffic Violation",
      href: "/dashboard/traffic-violation",
      icon: TruckIcon,
      allowedUserLevels: ["super_admin", "admin"],
    },
  ];

  const getFilteredNavigation = useCallback((): NavigationItem[] => {
    return navigationConfig.filter((item) => {
      if (!item.allowedUserLevels) return true;
      return item.allowedUserLevels.includes(userRole);
    });
  }, [userRole]);

  const getNavigationWithActiveState = useCallback((): NavigationItem[] => {
    const filtered = getFilteredNavigation();

    return filtered.map((item) => {
      const isItemActive = item.href === pathname;
      const isSubmenuActive = item.submenu?.some(
        (sub) => sub.href === pathname,
      );

      return {
        ...item,
        current: isItemActive || isSubmenuActive,
      };
    });
  }, [pathname, getFilteredNavigation]);

  const [navigation, setNavigation] = useState<NavigationItem[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const nav = getNavigationWithActiveState();
    setNavigation(nav);

    nav.forEach((item) => {
      if (item.submenu && item.submenu.some((sub) => sub.href === pathname)) {
        setExpandedItems((prev) => new Set(prev).add(item.name));
      }
    });
  }, [pathname, getNavigationWithActiveState]);

  const toggleExpanded = (itemName: string) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemName)) {
        newSet.delete(itemName);
      } else {
        newSet.add(itemName);
      }
      return newSet;
    });
  };

  const isCurrentSubItem = (href: string) => href === pathname;
  const isSettingsActive = pathname === "/dashboard/settings";

  const renderNavigationItems = (closeOnNavigate = false) => (
    <ul role="list" className="space-y-1">
      {mounted &&
        navigation.map((item) => (
          <li key={item.name}>
            {item.hasSubmenu ? (
              <>
                <button
                  onClick={() => toggleExpanded(item.name)}
                  className={classNames(
                    item.current
                      ? "bg-gray-100 text-gray-900"
                      : "text-gray-700 hover:bg-gray-50 hover:text-gray-900",
                    "group flex w-full items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  )}
                >
                  <span>{item.name}</span>
                  {expandedItems.has(item.name) ? (
                    <ChevronDownIcon className="ml-auto h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronRightIcon className="ml-auto h-4 w-4 text-gray-400" />
                  )}
                </button>
                {expandedItems.has(item.name) && item.submenu && (
                  <ul className="ml-4 mt-1 space-y-1 border-l border-gray-200 pl-3">
                    {item.submenu.map((subItem) => (
                      <li key={subItem.name}>
                        <Link
                          href={subItem.href}
                          onClick={() => closeOnNavigate && setSidebarOpen(false)}
                          className={classNames(
                            isCurrentSubItem(subItem.href)
                              ? "bg-gray-100 text-gray-900"
                              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                            "group flex rounded-md px-3 py-2 text-sm font-medium transition-colors",
                          )}
                        >
                          {subItem.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <Link
                href={item.href || "#"}
                onClick={() => closeOnNavigate && setSidebarOpen(false)}
                className={classNames(
                  item.current
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-700 hover:bg-gray-50 hover:text-gray-900",
                  "group flex rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                )}
              >
                {item.name}
              </Link>
            )}
          </li>
        ))}
    </ul>
  );

  return (
    <>
      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="relative z-50 lg:hidden" role="dialog" aria-modal="true">
          <div
            className="fixed inset-0 bg-gray-900/80"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed inset-0 flex">
            <div className="relative mr-16 flex w-full max-w-xs flex-1">
              <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                <button
                  type="button"
                  className="-m-2.5 p-2.5"
                  onClick={() => setSidebarOpen(false)}
                >
                  <span className="sr-only">Close sidebar</span>
                  <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
                </button>
              </div>

              <div className="flex grow flex-col overflow-y-auto border-r border-gray-200 bg-white px-4 pb-6 pt-4 font-poppins">
                <div className="flex h-14 shrink-0 items-center gap-2 px-2">
                  <Image
                    src="/login.png"
                    alt="SafeLink"
                    width={28}
                    height={28}
                    className="h-7 w-7 object-contain"
                    priority
                  />
                  <span className="-translate-y-1 text-base font-semibold text-gray-900">
                    SafeLink Dashboard
                  </span>
                </div>
                <nav className="mt-4 flex flex-1 flex-col">
                  {renderNavigationItems(true)}
                  <div className="mt-auto pt-4">
                    {["admin", "super_admin"].includes(userRole) && (
                      <Link
                        href="/dashboard/settings"
                        onClick={() => setSidebarOpen(false)}
                        className={classNames(
                          isSettingsActive
                            ? "bg-gray-100 text-gray-900"
                            : "text-gray-700 hover:bg-gray-50 hover:text-gray-900",
                          "flex items-center gap-x-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                        )}
                      >
                        <Cog6ToothIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                        <span>Settings</span>
                      </Link>
                    )}
                  </div>
                </nav>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
        <div className="flex grow flex-col overflow-y-auto border-r border-gray-200 bg-white px-4 pb-6 pt-4 font-poppins">
          <div className="flex h-14 items-center gap-2 px-2">
            <Image
              src="/login.png"
              alt="SafeLink"
              width={28}
              height={28}
              className="h-7 w-7 object-contain"
              priority
            />
            <span className="-translate-y-1 text-base font-semibold text-gray-900">
              SafeLink Dashboard
            </span>
          </div>

          <nav className="mt-4 flex flex-1 flex-col">
            {renderNavigationItems()}
            <div className="mt-auto pt-4">
              {["admin", "super_admin"].includes(userRole) && (
                <Link
                  href="/dashboard/settings"
                  className={classNames(
                    isSettingsActive
                      ? "bg-gray-100 text-gray-900"
                      : "text-gray-700 hover:bg-gray-50 hover:text-gray-900",
                    "flex items-center gap-x-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  )}
                >
                  <Cog6ToothIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  <span>Settings</span>
                </Link>
              )}
            </div>
          </nav>
        </div>
      </div>
    </>
  );
}