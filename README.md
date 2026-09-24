# ToolNest — Digital Tools Platform (V1)

A bilingual (Arabic + English) web platform of ten focused online tools for PDF, images,
developers and small business. Version 1 is **client-side first**: every tool runs inside the
visitor's browser, so there is nothing to upload, nothing to store and almost nothing to pay
for in server capacity.

> The name in `lib/site.ts` is a working title. Change it in one place and it changes everywhere.

## What ships in V1

| Group | Tool | Route |
| --- | --- | --- |
| PDF | Compress PDF (safe + strong modes) | `/{locale}/tools/pdf-compressor/` |
| PDF | Merge PDF | `/{locale}/tools/merge-pdf/` |
| PDF | PDF to Word (.docx) | `/{locale}/tools/pdf-to-word/` |
| Image | Image Compressor | `/{locale}/tools/image-compressor/` |
| Image | Image Converter (JPG/PNG/WebP) | `/{locale}/tools/image-converter/` |
| Image | QR Code Generator (PNG + SVG) | `/{locale}/tools/qr-code-generator/` |
| Developer | JSON Formatter / Validator | `/{locale}/tools/json-formatter/` |
| Developer | JWT Decoder | `/{locale}/tools/jwt-decoder/` |
| Developer | Regex Tester | `/{locale}/tools/regex-tester/` |
| Business | Smart Pricing Calculator | `/{locale}/tools/smart-pricing-calculator/` |

Plus: home, all-tools index, four category pages, pricing (Free/Pro/Business, marked as
planned), four long-form guides, about, contact, privacy, terms and cookies — all in both
languages, all statically generated.

`locale` is `en` or `ar`; `/ar/` renders right-to-left.

## Accounts, history and limits (V2)

A free account is live: register with an email and password, and the platform keeps a record of
what you ran, how much data it saved you and how much of your daily allowance you have used.

- **Auth** — email + password (scrypt hashing), httpOnly session cookie, 30 days.
- **History** — tool runs with metadata only (tool, input size, output size, duration, time).
  File contents are never stored: the tools process everything in the browser.
- **Allowance** — guest 5 runs/day per browser, free account 40/day, Pro 2,000, Business 10,000.
  Because the tools run locally, the allowance is a soft limit: the tool keeps working, the
  notice explains the stop and a free account raises it.
- **Rate limiting** — fixed windows counted in Postgres (`rate_limits`): sign-in 5 attempts /
  15 min, registration 10 / hour, password change 5 / 15 min, all per hashed IP. Over the limit
  the API answers `429` with a `Retry-After` header. A successful sign-in clears its own counter,
  so a real user is never locked out by their own logins.
- **Sessions** — changing a password deletes every session of that user and issues a fresh one;
  expired sessions and rate-limit rows older than two hours are removed by housekeeping that runs
  at most every 30 minutes (there is no scheduler in this environment).
- **Account page** — plan and usage, history with delete/clear, profile (name, language) and
  password change.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/auth/register` · `/api/auth/login` · `/api/auth/logout` | session |
| GET | `/api/auth/me` | current user + usage summary |
| PATCH | `/api/auth/profile` | name, preferred language |
| POST | `/api/auth/password` | change password |
| POST | `/api/runs` | record a run (returns remaining allowance, 429 when spent) |
| GET/DELETE | `/api/history` | list, delete one (`?id=`) or clear all |
| GET | `/api/usage` | counters per tool, totals, bytes saved |

Postgres tables (`users`, `sessions`, `tool_runs`) are created on first use — no migration step
to run. `DATABASE_URL` is injected by the platform; if it is missing the site still works, with
accounts disabled and a clear notice.

## Limits and safety

Everything that could exhaust the visitor's device or our API is capped, and the user is told
why rather than having files silently ignored.

| Where | Limit |
| --- | --- |
| API JSON bodies | 1 MB (checked from `Content-Length` and the real byte length) |
| Image tools | 20 files, 25 MB each, 100 MB total |
| Merge PDF | 20 files, 50 MB each, 100 MB total, 300 pages in total |
| PDF compressor / PDF to Word | 50 MB, 300 pages |
| Regex tester | 2,000 characters of pattern, 500,000 characters of text |
| JSON formatter | 2 MB before anything is parsed |
| Tool statistics | sizes and durations are validated and clamped server-side |

Reported usage is self-reported by the browser, so it is used for history and statistics only —
anything billed later must be measured on the server.

Baseline security headers are sent from `next.config.mjs` (`X-Content-Type-Options`,
`Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security`, and `X-Frame-Options`,
which defaults to `SAMEORIGIN` so the app can still be previewed inside a frame — set
`X_FRAME_OPTIONS=DENY` to change it). A strict CSP is deliberately not set yet: the tools rely on
blob/data URLs and web fonts. The production container runs as the unprivileged `node` user.

## Stack

- **Next.js 15 (App Router) + React 19 + TypeScript**, server-rendered. Tool pages are still
  prerendered as real HTML (SEO), while `/api` routes handle accounts, history and limits.
  Published from the included `Dockerfile`.
- **Tailwind CSS v4** with a small design system in `app/globals.css` (light/dark, RTL-aware).
- Client-side libraries: `pdf-lib` (merge, rebuild, compose), `pdfjs-dist` (page rendering, text
  extraction), `docx` (Word output), `qrcode` (PNG/SVG), Canvas & `createImageBitmap` (images).

### Why not Laravel + MySQL + Redis yet

The project document proposes Next.js + Laravel + MySQL + Redis. That backend only earns its
keep once there are **accounts, saved history, subscriptions, queue jobs and heavy server-side
PDF/OCR** — none of which exist in V1. Building it now would add cost and risk without adding a
single usable feature, and it would move file processing onto a server, against the privacy
principle in the same document. The static-first V1 keeps the platform free to run and easy to
index; the API service (Dockerfile + Postgres) is the next stage.

## Project layout

```
app/
  layout.tsx                  root shell: fonts, theme + lang/dir boot script
  page.tsx                    "/" → picks Arabic or English from the browser
  not-found.tsx               404
  [locale]/
    layout.tsx                header, footer, dir=rtl|ltr, per-locale metadata
    page.tsx                  home (hero, search, categories, guides)
    tools/page.tsx            all tools + instant search and filters
    tools/[slug]/page.tsx     one tool page (or a category page)
    pricing | blog | blog/[slug] | about | contact | privacy | terms | cookies
components/
  Header, Footer, ToolCard, ToolSearch, Breadcrumbs, JsonLd, LegalPage, ThemeToggle, LocaleSwitch
  tools/                      one component per tool + shared tool UI (FileDrop, Stat, Notice…)
lib/
  site.ts        brand, locales, categories
  i18n.ts        every UI string in both languages
  tools.ts       tool registry: slugs, categories, SEO copy, how-to, FAQ, examples
  pages.ts       about / pricing / legal copy, both languages
  blog.ts        guide articles, both languages
  meta.ts        metadata + JSON-LD builders
  images.ts, pdf.ts, urls.ts, utils.ts
scripts/
  copy-pdf-worker.mjs   puts the pdf.js worker in public/ before dev/build
  generate-seo.mjs      writes sitemap.xml + robots.txt into out/ after build
```

## Adding an eleventh tool

1. Add an entry to `tools` in `lib/tools.ts` (slug, category, icon, gradient, and the copy for
   both locales: name, tagline, h1, description, SEO title/description, keywords, how-to steps,
   FAQ, examples).
2. Write `components/tools/MyTool.tsx` (client component, receives `locale`).
3. Register it in `components/tools/ToolRunner.tsx` with `dynamic(..., { ssr: false })` so the
   tool is code-split and only loads on its own page.
4. Add the slug to the tool list in `scripts/generate-seo.mjs`.

Nothing else: routing, breadcrumbs, structured data, related tools, sitemap, hreflang and both
languages come from the registry.

## SEO

- One static HTML page per tool per language; unique title, meta description, keywords, H1/H2s.
- `hreflang` alternates (en/ar + x-default) and canonical URLs whenever the public origin is
  known at build time (see below).
- JSON-LD: `WebSite`, `SoftwareApplication`, `FAQPage`, `BreadcrumbList`, `Article`.
- Internal linking: category pages, related tools, guides → tools.
- `sitemap.xml` + `robots.txt` are generated into `out/` by `scripts/generate-seo.mjs`.

The public origin is read from `MYTHEX_WEB_ORIGIN` at request time — no hostname is ever
hard-coded, so adding a custom domain does not invalidate canonicals. If the variable is absent the
site still works: `robots.txt` is served without a sitemap line and no canonical/hreflang tags are
emitted, rather than emitting wrong ones.

`sitemap.xml` uses a real last-modified date per page (blog articles use their own publication
date, tools and legal pages use the date their section changed — see `contentDates` in
`lib/site.ts`), so a rebuild never makes unchanged pages look freshly edited.

## Tests

```bash
npm test          # vitest run
npm run test:watch
```

Covered: password hashing and verification, schema-before-query ordering on registration,
duplicate-email and weak-input rejection, sign-in with a wrong and a right password, brute-force
locking after five failures, session rotation on password change, the rate-limit windows and
`Retry-After` maths, API body-size handling, file/page/regex/JSON limits, registered tool
integrity in both languages, sitemap last-modified dates, and the URL/formatting helpers.
Browser-level flows are exercised against the live preview (Playwright) rather than a mocked DOM.

## Local development

```bash
npm install          # also copies the pdf.js worker into public/
npm run dev          # http://localhost:3000
npm run build        # production build (needs DATABASE_URL for the runtime only)
npm run typecheck

# verify a build while the dev server is running, without touching .next/
NEXT_DIST_DIR=.next-build npm run build
```

## Roadmap (from the project document)

- **V1** — 10 tools, bilingual, SEO, legal pages.
- **V2 (this release)** — accounts, saved history, usage limits, account dashboard, Postgres,
  Postgres-backed SEO routes (sitemap/robots read the live origin).
- **V2 next** — Pro/Business billing (Stripe), batch processing, admin dashboard.
- **V3** — heavy PDF work: OCR on scans, split/protect/sign, plus first AI tools.
- **V4** — public API, API keys, teams, usage dashboard.
- **V5** — mobile apps sharing the same API, integrations, marketplace.

Deliberately **not** yet: payments, an admin panel, and server-side file processing (OCR on
scans), plus the Pro/Business plans shown on the pricing page.
