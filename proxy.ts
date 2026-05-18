import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, ADMIN_COOKIE } from "@/lib/auth";

export const config = {
  matcher: [
    /*
     * Match everything except: static assets, Next internals, and favicon.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};

const SECURITY_HEADERS: Record<string, string> = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

function applySecurityHeaders(res: NextResponse) {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    res.headers.set(k, v);
  }
  if (process.env.NODE_ENV === "production") {
    res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }
  return res;
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isAdminScope =
    pathname.startsWith("/admin") || pathname.startsWith("/api/admin");

  if (isAdminScope && pathname !== "/admin/login" && !pathname.startsWith("/api/admin/login")) {
    const token = req.cookies.get(ADMIN_COOKIE)?.value;
    if (!verifyAdminToken(token)) {
      if (pathname.startsWith("/api/admin/")) {
        return applySecurityHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
      }
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("next", pathname);
      return applySecurityHeaders(NextResponse.redirect(url));
    }
  }

  return applySecurityHeaders(NextResponse.next());
}
