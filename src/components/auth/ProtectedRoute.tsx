"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, ReactNode } from "react";

const PUBLIC_PATHS = ["/dashboard/live-stream", "/dashboard/social-media"];

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const isPublicPath = PUBLIC_PATHS.includes(pathname);

  useEffect(() => {
    if (status === "unauthenticated" && !isPublicPath) {
      router.replace("/login");
    }
  }, [status, router, pathname, isPublicPath]);

  if (status !== "authenticated" && !isPublicPath) {
    return null;
  }

  return <>{children}</>;
}