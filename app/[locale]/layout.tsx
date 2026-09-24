import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Footer } from "@/components/Footer";
import { LocaleMemory } from "@/components/LocaleMemory";
import { Header } from "@/components/Header";
import { categoryNames, dictionaries } from "@/lib/i18n";
import { categories, isLocale, localeDir, locales, site, type Locale } from "@/lib/site";
import { absoluteUrl } from "@/lib/urls";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = dictionaries[locale];
  return {
    title: {
      default: dict.home.title,
      template: `%s · ${site.brand}`,
    },
    description: dict.home.subtitle,
    alternates: {
      languages: {
        en: absoluteUrl("en") ?? undefined,
        ar: absoluteUrl("ar") ?? undefined,
      },
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const typed = locale as Locale;
  const dict = dictionaries[typed];

  return (
    <div dir={localeDir(typed)} lang={typed} className="flex min-h-screen flex-col">
      <LocaleMemory locale={typed} />
      <Header
        locale={typed}
        brand={site.brand}
        nav={dict.nav}
        auth={{ signIn: dict.auth.signIn, account: dict.auth.account }}
        categories={categories.map((category) => ({
          id: category.id,
          slug: category.slug,
          icon: category.icon,
          name: categoryNames[typed][category.id],
        }))}
      />
      <main className="flex-1">{children}</main>
      <Footer
        locale={typed}
        brand={site.brand}
        footer={dict.footer}
        categoryLinks={categories.map((category) => ({
          id: category.id,
          slug: category.slug,
          name: categoryNames[typed][category.id],
        }))}
      />
    </div>
  );
}
