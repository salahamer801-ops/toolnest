import type { Locale } from "./site";

export const href = (locale: Locale, path = "") => {
  const clean = path.replace(/^\/+|\/+$/g, "");
  return clean ? `/${locale}/${clean}/` : `/${locale}/`;
};

/** Public origin when the platform tells us at build time — never hard-coded. */
export const siteOrigin = (): string | null => {
  const raw = (process.env.MYTHEX_WEB_ORIGIN || process.env.NEXT_PUBLIC_SITE_ORIGIN || "").split(",")[0].trim().replace(/\/+$/, "");
  return raw || null;
};

export const absoluteUrl = (locale: Locale, path = "") => {
  const origin = siteOrigin();
  return origin ? `${origin}${href(locale, path)}` : null;
};
