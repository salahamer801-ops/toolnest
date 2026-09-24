export const site = {
  /** Working brand name — change it here and it updates everywhere. */
  brand: "ToolNest",
  version: "1.0",
  contactEmail: "salahamer801@gmail.com",
  github: "https://github.com/salahamer801-ops/toolnest",
};

/**
 * Real "last changed" dates, used for sitemap lastModified instead of the
 * current time. Bump the section you actually edit; a page never looks newer
 * than it is just because the site was rebuilt.
 */
export const contentDates = {
  site: "2026-09-24",
  tools: "2026-09-24",
  legal: "2026-09-24",
};

/** Per-page overrides when a single page changes without the rest of its section. */
export const pageDates: Record<string, string> = {};

export type Locale = "en" | "ar";

export const locales: Locale[] = ["en", "ar"];
export const defaultLocale: Locale = "en";

export const localeDir = (locale: Locale): "ltr" | "rtl" => (locale === "ar" ? "rtl" : "ltr");
export const isLocale = (value: string): value is Locale => locales.includes(value as Locale);

export type CategoryId = "pdf" | "image" | "developer" | "business";

export const categories: {
  id: CategoryId;
  slug: string;
  icon: string;
  gradient: string;
}[] = [
  { id: "pdf", slug: "pdf-tools", icon: "file-text", gradient: "from-rose-500 to-orange-500" },
  { id: "image", slug: "image-tools", icon: "image", gradient: "from-sky-500 to-cyan-500" },
  { id: "developer", slug: "developer-tools", icon: "code", gradient: "from-brand-600 to-accent-600" },
  { id: "business", slug: "business-tools", icon: "briefcase", gradient: "from-emerald-500 to-teal-600" },
];

export const categorySlug = (id: CategoryId) => categories.find((c) => c.id === id)!.slug;
export const categoryById = (id: CategoryId) => categories.find((c) => c.id === id)!;
export const categoryBySlug = (slug: string) => categories.find((c) => c.slug === slug);
