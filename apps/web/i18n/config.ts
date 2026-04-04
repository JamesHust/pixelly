export const locales = ["en", "vi", "ja", "zh", "id"] as const
export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = "en"

export const localeLabels: Record<Locale, string> = {
  en: "English",
  vi: "Tiếng Việt",
  ja: "日本語",
  zh: "中文",
  id: "Bahasa Indonesia",
}
