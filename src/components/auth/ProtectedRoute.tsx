"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, ReactNode } from "react";

const PUBLIC_PATHS = [
  "/dashboard/live-stream",
  "/dashboard/social-media", // includes sub-routes: /cases/investigating, /cases/resolved, /posts, etc.
  "/dashboard/women-children",
  "/dashboard/women-childern",
  "/dashboard/traffic-violation",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const isPublic = isPublicPath(pathname);

  useEffect(() => {
    // Only redirect when session has finished loading and user is not authenticated
    if (status === "unauthenticated" && !isPublic) {
      router.replace("/login");
    }
  }, [status, router, pathname, isPublic]);

  // Show nothing while loading session (avoid redirecting before session is ready)
  if (status === "loading" && !isPublic) {
    return null;
  }

  if (status !== "authenticated" && !isPublic) {
    return null;
  }

  return <>{children}</>;
}