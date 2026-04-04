import { getRequestConfig } from "next-intl/server"
import { cookies, headers } from "next/headers"
import { defaultLocale, locales, type Locale } from "./config"

function resolveLocale(raw: string | undefined): Locale {
  return (locales as readonly string[]).includes(raw ?? "")
    ? (raw as Locale)
    : defaultLocale
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const headerStore = await headers()

  // Cookie takes priority; fall back to header set by middleware
  const locale = resolveLocale(
    cookieStore.get("NEXT_LOCALE")?.value ??
    headerStore.get("x-locale") ??
    undefined
  )

  return {
    locale,
    messages: (await import(`../locales/${locale}.json`)).default,
  }
})
