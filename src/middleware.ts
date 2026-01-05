import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

const roleAccess = {
  "/dashboard/admin": ["super_admin"],
  "/dashboard/app-user-management": ["super_admin"],
  "/dashboard": ["super_admin", "admin"],
  "/dashboard/classes": ["super_admin", "admin"],
  "/dashboard/classes/create-classes": ["admin"],
  "/dashboard/classes/enrolled-classes": ["super_admin", "admin"],
  "/dashboard/classes/incompleted-classes": ["super_admin", "admin"],
  "/dashboard/news-management": ["super_admin", "admin"],
  "/dashboard/promotion": ["super_admin", "admin"],
  "/dashboard/membership": ["super_admin", "admin"],
  "/dashboard/settings": ["super_admin", "admin"],
};

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    if (pathname === "/dashboard/live-stream") {
      return NextResponse.next();
    }

    if (!token) {
      return NextResponse.redirect(new URL("/api/auth/signin", req.url));
    }

    const userRole = token.role as string;

    if (roleAccess[pathname as keyof typeof roleAccess]) {
      const allowedRoles = roleAccess[pathname as keyof typeof roleAccess];
      if (!allowedRoles.includes(userRole)) {
        return NextResponse.redirect(new URL("/unauthorized", req.url));
      }
    } else if (pathname.startsWith("/dashboard")) {
      if (!["super_admin", "admin"].includes(userRole)) {
        return NextResponse.redirect(new URL("/unauthorized", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        if (req.nextUrl.pathname === "/dashboard/live-stream") {
          return true;
        }
        return !!token;
      },
    },
  },
);

export const config = {
  matcher: ["/dashboard/:path*"],
};
