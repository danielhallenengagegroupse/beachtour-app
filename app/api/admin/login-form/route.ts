import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, getAdminSessionToken, isValidAdminCredentials } from "@/lib/admin-auth";

function normalizeNextPath(nextPath: string | null) {
  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return "/admin";
  }

  return nextPath;
}

function buildHtmlRedirectDocument(path: string) {
  const safePath = path.replace(/"/g, "&quot;");
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="refresh" content="0;url=${safePath}" />
    <title>Redirecting...</title>
  </head>
  <body>
    <p>Redirecting to <a href="${safePath}">${safePath}</a>...</p>
  </body>
</html>`;
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();

  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");
  const nextPath = normalizeNextPath(formData.get("next")?.toString() ?? null);

  if (!isValidAdminCredentials(username, password)) {
    const failedLoginUrl = new URLSearchParams({ error: "1" });
    if (nextPath !== "/admin") {
      failedLoginUrl.set("next", nextPath);
    }

    return new NextResponse(buildHtmlRedirectDocument(`/admin/login?${failedLoginUrl.toString()}`), {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const response = new NextResponse(buildHtmlRedirectDocument(nextPath), {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: getAdminSessionToken(),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}
