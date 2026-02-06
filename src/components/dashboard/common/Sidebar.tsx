"use client";

import { Fragment, useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { Dialog, Transition } from "@headlessui/react";
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

  return (
    <>
      {/* Mobile Sidebar */}
      <Transition.Root show={sidebarOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50 lg:hidden"
          onClose={setSidebarOpen}
        >
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-900/80" />
          </Transition.Child>

          <div className="fixed inset-0 flex">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
                <Transition.Child
                  as={Fragment}
                  enter="ease-in-out duration-300"
                  enterFrom="opacity-0"
                  enterTo="opacity-100"
                  leave="ease-in-out duration-300"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                    <button
                      type="button"
                      className="-m-2.5 p-2.5"
                      onClick={() => setSidebarOpen(false)}
                    >
                      <span className="sr-only">Close sidebar</span>
                      <XMarkIcon
                        className="h-6 w-6 text-white"
                        aria-hidden="true"
                      />
                    </button>
                  </div>
                </Transition.Child>

                <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-4 font-poppins">
                  <div className="flex h-16 shrink-0 items-center">
                    <span className="text-xl font-bold text-gray-900">
                      SaFELINK
                    </span>
                  </div>
                  <nav className="flex flex-1 flex-col">
                    <ul role="list" className="flex flex-1 flex-col gap-y-7">
                      <li>
                        <ul role="list" className="-mx-2 space-y-2">
                          {mounted &&
                            navigation.map((item) => (
                              <li key={item.name}>
                                {item.hasSubmenu ? (
                                  <>
                                    <button
                                      onClick={() => toggleExpanded(item.name)}
                                      className={classNames(
                                        item.current
                                          ? "bg-gray-500 text-blue-600"
                                          : "text-gray-700 hover:text-blue-600 hover:bg-blue-50",
                                        "group flex w-full items-center gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold",
                                      )}
                                    >
                                      <item.icon
                                        className={classNames(
                                          item.current
                                            ? "text-blue-600"
                                            : "text-gray-400 group-hover:text-blue-600",
                                          "h-6 w-6 shrink-0",
                                        )}
                                        aria-hidden="true"
                                      />
                                      {item.name}
                                      {expandedItems.has(item.name) ? (
                                        <ChevronDownIcon className="ml-auto h-4 w-4 text-gray-400" />
                                      ) : (
                                        <ChevronRightIcon className="ml-auto h-4 w-4 text-gray-400" />
                                      )}
                                    </button>
                                    {expandedItems.has(item.name) &&
                                      item.submenu && (
                                        <ul className="ml-6 mt-1 space-y-1">
                                          {item.submenu.map((subItem) => (
                                            <li key={subItem.name}>
                                              <a
                                                href={subItem.href}
                                                className={classNames(
                                                  isCurrentSubItem(subItem.href)
                                                    ? "bg-blue-50 text-blue-600"
                                                    : "text-gray-700 hover:text-blue-600 hover:bg-blue-50",
                                                  "group flex rounded-md p-2 text-sm leading-6 font-semibold",
                                                )}
                                              >
                                                {subItem.name}
                                              </a>
                                            </li>
                                          ))}
                                        </ul>
                                      )}
                                  </>
                                ) : (
                                  <a
                                    href={item.href}
                                    className={classNames(
                                      item.current
                                        ? "bg-blue-50 text-blue-600"
                                        : "text-gray-700 hover:text-blue-600 hover:bg-blue-50",
                                      "group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold",
                                    )}
                                  >
                                    <item.icon
                                      className={classNames(
                                        item.current
                                          ? "text-blue-600"
                                          : "text-gray-400 group-hover:text-blue-600",
                                        "h-6 w-6 shrink-0",
                                      )}
                                      aria-hidden="true"
                                    />
                                    {item.name}
                                  </a>
                                )}
                              </li>
                            ))}
                        </ul>
                      </li>

                      {/* Settings */}
                      {["admin", "super_admin"].includes(userRole) && (
                        <li className="-mx-6 mt-auto">
                          <a
                            href="/dashboard/settings"
                            className="flex items-center gap-x-4 px-6 py-3 text-sm font-semibold leading-6 text-gray-900 hover:bg-gray-50"
                          >
                            <Cog6ToothIcon
                              className="h-6 w-6 text-gray-400 group-hover:text-blue-600"
                              aria-hidden="true"
                            />
                            <span aria-hidden="true">Settings</span>
                          </a>
                        </li>
                      )}

                      {/* Profile */}
                      <li className="-mx-6">
                        <a
                          href="#"
                          className="flex items-center gap-x-4 px-6 py-3 text-sm font-semibold leading-6 text-gray-900 hover:bg-gray-50"
                        >
                          <img
                            className="h-8 w-8 rounded-full bg-gray-50"
                            src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                            alt=""
                          />
                          <span className="sr-only">Your profile</span>
                          <span aria-hidden="true">Tom Cook</span>
                        </a>
                      </li>
                    </ul>
                  </nav>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-white px-6 pb-4 font-poppins">
          <div className="flex justify-center items-center h-16">
            <span className="text-xl font-bold text-gray-900">
              SaFELINK
            </span>
          </div>

          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-2">
                  {mounted &&
                    navigation.map((item) => (
                      <li key={item.name}>
                        {item.hasSubmenu ? (
                          <>
                            <button
                              onClick={() => toggleExpanded(item.name)}
                              className={classNames(
                                item.current
                                  ? "bg-blue-50 text-blue-600"
                                  : "text-gray-700 hover:text-blue-600 hover:bg-blue-50",
                                "group flex w-full items-center gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold",
                              )}
                            >
                              <item.icon
                                className={classNames(
                                  item.current
                                    ? "text-blue-600"
                                    : "text-gray-400 group-hover:text-blue-600",
                                  "h-6 w-6 shrink-0",
                                )}
                                aria-hidden="true"
                              />
                              {item.name}
                              {expandedItems.has(item.name) ? (
                                <ChevronDownIcon className="ml-auto h-4 w-4 text-gray-400" />
                              ) : (
                                <ChevronRightIcon className="ml-auto h-4 w-4 text-gray-400" />
                              )}
                            </button>
                            {expandedItems.has(item.name) && item.submenu && (
                              <ul className="ml-6 mt-1 space-y-1">
                                {item.submenu.map((subItem) => (
                                  <li key={subItem.name}>
                                    <a
                                      href={subItem.href}
                                      className={classNames(
                                        isCurrentSubItem(subItem.href)
                                          ? "bg-blue-50 text-blue-600"
                                          : "text-gray-700 hover:text-blue-600 hover:bg-blue-50",
                                        "group flex rounded-md p-2 text-sm leading-6 font-semibold",
                                      )}
                                    >
                                      {subItem.name}
                                    </a>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </>
                        ) : (
                          <a
                            href={item.href}
                            className={classNames(
                              item.current
                                ? "bg-blue-50 text-blue-600"
                                : "text-gray-700 hover:text-blue-600 hover:bg-blue-50",
                              "group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold",
                            )}
                          >
                            <item.icon
                              className={classNames(
                                item.current
                                  ? "text-blue-600"
                                  : "text-gray-400 group-hover:text-blue-600",
                                "h-6 w-6 shrink-0",
                              )}
                              aria-hidden="true"
                            />
                            {item.name}
                          </a>
                        )}
                      </li>
                    ))}
                </ul>
              </li>

              {/* Settings  */}
              {["admin", "super_admin"].includes(userRole) && (
                <li className="-mx-6 mt-auto">
                  <a
                    href="/dashboard/settings"
                    className="flex items-center gap-x-4 px-6 py-3 text-sm font-semibold leading-6 text-gray-900 hover:bg-gray-50"
                  >
                    <Cog6ToothIcon
                      className="h-6 w-6 text-gray-400 group-hover:text-blue-600"
                      aria-hidden="true"
                    />
                    <span aria-hidden="true">Settings</span>
                  </a>
                </li>
              )}
            </ul>
          </nav>
        </div>
      </div>
    </>
  );
}