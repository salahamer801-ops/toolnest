/** @type {import('next').NextConfig} */
const nextConfig = {
  // The site is server-rendered: tool pages are still prerendered as real HTML
  // (SEO), while /api routes handle accounts, history and usage limits.
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  serverExternalPackages: ["pg"],
  // A separate dist dir can be used for verifying a production build while the
  // dev server is running (NEXT_DIST_DIR). Unset in production.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
