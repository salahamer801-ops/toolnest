import type { Metadata } from "next";
import type { Locale } from "./site";
import { site } from "./site";
import { absoluteUrl, href } from "./urls";

export function pageMetadata({
  locale,
  path,
  title,
  description,
  keywords,
  type = "website",
}: {
  locale: Locale;
  path: string;
  title: string;
  description: string;
  keywords?: string[];
  type?: "website" | "article";
}): Metadata {
  const canonical = absoluteUrl(locale, path);
  const other: Locale = locale === "ar" ? "en" : "ar";
  const otherUrl = absoluteUrl(other, path);

  return {
    title,
    description,
    keywords,
    alternates: canonical
      ? {
          canonical,
          languages: {
            [locale]: canonical,
            [other]: otherUrl ?? undefined,
            "x-default": absoluteUrl("en", path) ?? canonical,
          },
        }
      : undefined,
    openGraph: {
      title: `${title} · ${site.brand}`,
      description,
      type,
      siteName: site.brand,
      locale: locale === "ar" ? "ar_AR" : "en_US",
      url: canonical ?? undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} · ${site.brand}`,
      description,
    },
  };
}

export const siteJsonLd = (locale: Locale) => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: site.brand,
  inLanguage: locale,
  ...(absoluteUrl(locale) ? { url: absoluteUrl(locale) } : {}),
  description:
    locale === "ar"
      ? "أدوات مجانية لملفات PDF والصور والمطورين والأعمال تعمل داخل المتصفح."
      : "Free online tools for PDF, images, developers and small business, running in your browser.",
});

export const toolJsonLd = ({
  locale,
  name,
  description,
  path,
  category,
  faq,
}: {
  locale: Locale;
  name: string;
  description: string;
  path: string;
  category: string;
  faq: { q: string; a: string }[];
}) => [
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name,
    description,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Any (web browser)",
    inLanguage: locale,
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    ...(absoluteUrl(locale, path) ? { url: absoluteUrl(locale, path) } : {}),
    ...(category ? { keywords: category } : {}),
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: locale === "ar" ? "الرئيسية" : "Home", item: absoluteUrl(locale) ?? undefined },
      {
        "@type": "ListItem",
        position: 2,
        name: locale === "ar" ? "الأدوات" : "Tools",
        item: absoluteUrl(locale, "tools") ?? undefined,
      },
      { "@type": "ListItem", position: 3, name, item: absoluteUrl(locale, path) ?? undefined },
    ],
  },
];

export const canonicalPath = (locale: Locale, path = "") => href(locale, path);
