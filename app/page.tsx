"use client";

import { useEffect } from "react";

/** Chooses Arabic or English from the browser language on first visit. */
export default function RootRedirect() {
  useEffect(() => {
    const stored = (() => {
      try {
        return localStorage.getItem("locale");
      } catch {
        return null;
      }
    })();
    const fromBrowser = (navigator.languages?.[0] || navigator.language || "en").toLowerCase().startsWith("ar")
      ? "ar"
      : "en";
    const target = stored === "ar" || stored === "en" ? stored : fromBrowser;
    window.location.replace(`/${target}/`);
  }, []);

  return (
    <main className="container-x flex min-h-screen flex-col items-center justify-center gap-6 text-center">
      <p className="text-sm text-slate-500 dark:text-slate-400">Choosing your language…</p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <a href="/en/" className="btn-primary">
          Continue in English
        </a>
        <a href="/ar/" className="btn-secondary">
          المتابعة بالعربية
        </a>
      </div>
    </main>
  );
}
