import { NextResponse } from "next/server";

// No auth required: root goes straight to dashboard (social media), dashboard routes are public
export default function middleware(request: Request) {
  const url = new URL(request.url);
  if (url.pathname === "/") {
    return NextResponse.redirect(
      new URL("/dashboard/social-media", request.url),
    );
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/dashboard/:path*"],
};
