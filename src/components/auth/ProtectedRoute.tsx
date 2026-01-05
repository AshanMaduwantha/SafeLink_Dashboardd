"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, ReactNode } from "react";

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "unauthenticated" && pathname !== "/dashboard/live-stream") {
      router.replace("/");
    }
  }, [status, router, pathname]);

  if (status !== "authenticated" && pathname !== "/dashboard/live-stream") {
    return null;
  }

  return <>{children}</>;
}
