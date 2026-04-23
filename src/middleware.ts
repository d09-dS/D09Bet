import { NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { getToken } from "next-auth/jwt";

const intlMiddleware = createIntlMiddleware(routing);

const PUBLIC_PATHS = ["/login", "/register"];

function isPublicPath(pathname: string): boolean {
  // Remove locale prefix (e.g. /de/login → /login)
  const withoutLocale = pathname.replace(/^\/(de|en)/, "") || "/";
  return PUBLIC_PATHS.some((p) => withoutLocale === p || withoutLocale.startsWith(p + "/"));
}

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip API routes, static files, Next.js internals
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/_vercel") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Check auth for non-public pages
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token && !isPublicPath(pathname)) {
    // Not logged in → redirect to login
    const locale = pathname.match(/^\/(de|en)/)?.[1] || "de";
    const loginUrl = new URL(`/${locale}/login`, req.url);
    return NextResponse.redirect(loginUrl);
  }

  if (token && isPublicPath(pathname)) {
    // Already logged in → redirect away from login/register
    const locale = pathname.match(/^\/(de|en)/)?.[1] || "de";
    const homeUrl = new URL(`/${locale}`, req.url);
    return NextResponse.redirect(homeUrl);
  }

  // Run i18n middleware for locale routing
  return intlMiddleware(req);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
