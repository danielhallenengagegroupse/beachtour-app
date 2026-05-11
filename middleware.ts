import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, getAdminSessionToken } from "@/lib/admin-auth";

function isAdminAuthenticated(request: NextRequest) {
  const cookie = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  return cookie === getAdminSessionToken();
}

function isProtectedPage(pathname: string) {
  return pathname === "/admin" || pathname.startsWith("/players") || pathname.startsWith("/weeks") || pathname.startsWith("/games");
}

function isProtectedApi(pathname: string, method: string) {
  if (!pathname.startsWith("/api/")) {
    return false;
  }

  if (pathname.startsWith("/api/admin/login") || pathname.startsWith("/api/admin/logout")) {
    return false;
  }

  return method !== "GET" && method !== "HEAD";
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isProtectedPage(pathname) && !isProtectedApi(pathname, request.method)) {
    return NextResponse.next();
  }

  if (isAdminAuthenticated(request)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/admin/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
