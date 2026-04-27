import { NextResponse, type NextRequest } from "next/server";
import { getAuthCookieName } from "@/lib/auth/jwt";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect admin routes (later we’ll route-group them).
  if (pathname.startsWith("/admin")) {
    const token = request.cookies.get(getAuthCookieName())?.value;
    if (!token) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/admin";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};

