"use client";

import { useEffect, useState } from "react";
import {
  Bars3Icon,
  BellIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/useAuth";
import { useSession } from "next-auth/react";

// User profile shape is inferred from `useAuth()`; explicit interface not needed here

interface TopBarProps {
  setSidebarOpen: (open: boolean) => void;
}

export function TopBar({ setSidebarOpen }: TopBarProps) {
  const [mounted, setMounted] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [_loadingProfile, _setLoadingProfile] = useState(true);
  const { user, logout } = useAuth();
  const { data: session } = useSession();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!session) {
        return;
      }

      try {
        const response = await fetch("/api/profile");
        const data = await response.json();

        if (response.ok && data.avatarUrl) {
          setProfileImageUrl(data.avatarUrl);
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
      }
    };

    fetchProfile();
  }, [session]);

  const userName = user?.name || "User";
  const firstName = userName.split(" ")[0] || "User";
  const firstLetter = firstName.charAt(0).toUpperCase();

  const userProfile = {
    id: (user as any)?.id || "1",
    name: userName,
    firstName: firstName,
    lastName: userName.split(" ")[1] || "",
    email: user?.email || "user@example.com",
    profilePhoto: profileImageUrl || null,
    userType: "Admin",
    organizationName: "Dance Academy",
    phoneNumber: "123-456-7890",
    organization_id: "1",
  };

  const userNavigation = [
    { name: "Settings", href: "/dashboard/settings" },
    { name: "Sign Out", href: "#", onClick: logout },
  ];

  return (
    <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-xs sm:gap-x-6 sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={() => setSidebarOpen(true)}
        className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
      >
        <span className="sr-only">Open sidebar</span>
        <Bars3Icon aria-hidden="true" className="size-6" />
      </button>

      {/* Separator */}
      <div aria-hidden="true" className="h-6 w-px bg-gray-900/10 lg:hidden" />

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        <div className="flex items-center gap-x-4 lg:gap-x-6 ml-auto">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-400 hover:text-gray-500"
          >
            <span className="sr-only">View notifications</span>
            <BellIcon aria-hidden="true" className="size-6" />
          </button>

          {/* Separator */}
          <div
            aria-hidden="true"
            className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-900/10"
          />

          {/* Profile dropdown */}
          {mounted && (
            <Menu as="div" className="relative">
              <MenuButton className="-m-1.5 flex items-center p-1.5">
                <span className="sr-only">Open user menu</span>
                {userProfile.profilePhoto ? (
                  <img
                    alt=""
                    src={userProfile.profilePhoto}
                    className="size-10 rounded-full bg-gray-50 transition-opacity duration-500 object-cover"
                  />
                ) : (
                  <div className="size-10 rounded-full bg-[#0059FF] flex items-center justify-center text-white font-semibold text-sm transition-opacity duration-500">
                    {firstLetter}
                  </div>
                )}
                <span className="hidden lg:flex lg:items-center">
                  <span
                    aria-hidden="true"
                    className="ml-4 text-sm/6 font-semibold text-gray-900 transition-opacity duration-500"
                  >
                    {userProfile.name}
                  </span>
                  <ChevronDownIcon
                    aria-hidden="true"
                    className="ml-2 size-5 text-gray-400"
                  />
                </span>
              </MenuButton>
              <MenuItems
                transition
                className="absolute right-0 z-10 mt-2.5 w-32 origin-top-right rounded-md bg-white py-2 shadow-lg ring-1 ring-gray-900/5 transition focus:outline-hidden data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in"
              >
                {userNavigation.map((item) => (
                  <MenuItem key={item.name}>
                    {item.onClick ? (
                      <button
                        onClick={item.onClick}
                        className="block w-full text-left px-3 py-1 text-sm/6 text-gray-900 data-focus:bg-gray-50 data-focus:outline-hidden"
                      >
                        {item.name}
                      </button>
                    ) : (
                      <Link
                        href={item.href}
                        className="block px-3 py-1 text-sm/6 text-gray-900 data-focus:bg-gray-50 data-focus:outline-hidden"
                      >
                        {item.name}
                      </Link>
                    )}
                  </MenuItem>
                ))}
              </MenuItems>
            </Menu>
          )}
        </div>
      </div>
    </div>
  );
}
