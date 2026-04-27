import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";

const intlMiddleware = createMiddleware({
  locales: ["en", "zh-CN"],
  defaultLocale: "en",
});

export function middleware(request: NextRequest) {
  const response = intlMiddleware(request);

  const locale = request.cookies.get("NEXT_LOCALE")?.value ?? "en";
  response.headers.set("x-next-intl-locale", locale);

  return response;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
