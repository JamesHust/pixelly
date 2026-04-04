import { NextRequest, NextResponse } from "next/server"
import { locales, defaultLocale } from "@/i18n/config"

export function middleware(request: NextRequest) {
  // Read locale from cookie; fall back to Accept-Language, then default
  const cookieLocale = request.cookies.get("NEXT_LOCALE")?.value
  const acceptLanguage = request.headers.get("accept-language")?.split(",")[0]?.split("-")[0]

  const resolved =
    cookieLocale && (locales as readonly string[]).includes(cookieLocale)
      ? cookieLocale
      : acceptLanguage && (locales as readonly string[]).includes(acceptLanguage)
        ? acceptLanguage
        : defaultLocale

  const response = NextResponse.next()
  // Forward resolved locale as a header so next-intl/request.ts can read it
  response.headers.set("x-locale", resolved)
  return response
}

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
}
