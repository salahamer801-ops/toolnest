import type { MetadataRoute } from "next";
import { posts } from "@/lib/blog";
import { categories, locales } from "@/lib/site";
import { toolSlugs } from "@/lib/tools";
import { href, siteOrigin } from "@/lib/urls";

export const dynamic = "force-dynamic";

const staticPaths = [
  "",
  "tools",
  "pricing",
  "blog",
  "about",
  "contact",
  "privacy",
  "terms",
  "cookies",
  ...categories.map((category) => `tools/${category.slug}`),
  ...toolSlugs.map((slug) => `tools/${slug}`),
  ...posts.map((post) => `blog/${post.slug}`),
];

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = siteOrigin();
  if (!origin) return [];

  const now = new Date();

  return locales.flatMap((locale) =>
    staticPaths.map((path) => ({
      url: `${origin}${href(locale, path)}`,
      lastModified: now,
      changeFrequency: path.startsWith("tools/") ? ("monthly" as const) : ("weekly" as const),
      priority: path === "" ? 1 : path.startsWith("tools") ? 0.8 : 0.6,
      alternates: {
        languages: Object.fromEntries(locales.map((other) => [other, `${origin}${href(other, path)}`])),
      },
    })),
  );
}
