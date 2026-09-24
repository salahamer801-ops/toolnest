import type { Locale } from "./site";

export type PlanId = "guest" | "free" | "pro" | "business";

export interface PlanDefinition {
  id: PlanId;
  dailyLimit: number;
  name: Record<Locale, string>;
  note: Record<Locale, string>;
}

export const plans: Record<PlanId, PlanDefinition> = {
  guest: {
    id: "guest",
    dailyLimit: 5,
    name: { en: "Guest", ar: "زائر" },
    note: {
      en: "No account: a small daily allowance per browser.",
      ar: "بدون حساب: رصيد يومي صغير لكل متصفح.",
    },
  },
  free: {
    id: "free",
    dailyLimit: 40,
    name: { en: "Free account", ar: "حساب مجاني" },
    note: {
      en: "Signed in, with your own history and a higher daily allowance.",
      ar: "بحساب، مع سجل خاص بك ورصيد يومي أعلى.",
    },
  },
  pro: {
    id: "pro",
    dailyLimit: 2000,
    name: { en: "Pro", ar: "برو" },
    note: {
      en: "Heavy use, batch work and priority processing.",
      ar: "استخدام مكثّف ومعالجة بالدفعات وأولوية في التنفيذ.",
    },
  },
  business: {
    id: "business",
    dailyLimit: 10000,
    name: { en: "Business", ar: "الأعمال" },
    note: {
      en: "Teams, API keys and bulk processing.",
      ar: "فرق عمل ومفاتيح API ومعالجة بالجملة.",
    },
  },
};

export const planForRole = (role?: string | null): PlanId => {
  if (role === "pro") return "pro";
  if (role === "business") return "business";
  return "free";
};

export const planForUser = (user: { role: string } | null): PlanId => (user ? planForRole(user.role) : "guest");

export const planCopy = (plan: PlanId, locale: Locale) => plans[plan].name[locale];
