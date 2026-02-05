"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, ReactNode } from "react";

const PUBLIC_PATHS = [
  "/dashboard/live-stream",
  "/dashboard/social-media",
  "/dashboard/women-children",
  "/dashboard/women-childern",
];

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const isPublicPath = PUBLIC_PATHS.includes(pathname);

  useEffect(() => {
    // Only redirect when session has finished loading and user is not authenticated
    if (status === "unauthenticated" && !isPublicPath) {
      router.replace("/login");
    }
  }, [status, router, pathname, isPublicPath]);

  // Show nothing while loading session (avoid redirecting before session is ready)
  if (status === "loading" && !isPublicPath) {
    return null;
  }

  if (status !== "authenticated" && !isPublicPath) {
    return null;
  }

  return <>{children}</>;
}