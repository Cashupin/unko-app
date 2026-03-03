import type { NextConfig } from "next";

// ─── Security headers ──────────────────────────────────────────────────────────
//
// Applied to every route via the catch-all source pattern.
// Content-Security-Policy is environment-aware:
//   • Development: allows 'unsafe-eval' for Next.js HMR / fast refresh
//   • Production:  tighter policy without eval

const isDev = process.env.NODE_ENV === "development";

const csp = [
  "default-src 'self'",
  // Next.js requires 'unsafe-inline' for inline styles and hydration scripts.
  // 'unsafe-eval' is only needed for HMR in development.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'", // Tailwind CSS inlines styles
  // Allow images from Cloudinary (photo uploads) and Google (OAuth avatars).
  "img-src 'self' data: blob: https://res.cloudinary.com https://lh3.googleusercontent.com",
  "font-src 'self'",
  // Cloudinary upload endpoint is called directly from the browser.
  // In development, Next.js HMR uses WebSockets on a dynamic port — allow them.
  `connect-src 'self' https://api.cloudinary.com https://photon.komoot.io${isDev ? " ws://localhost:* ws://127.0.0.1:*" : ""}`,
  "media-src 'none'",
  "object-src 'none'",
  "frame-ancestors 'none'", // equivalent to X-Frame-Options DENY
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  // Force HTTPS for 2 years, including subdomains (only meaningful in production).
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Prevent the page from being loaded in an iframe (clickjacking protection).
  // Redundant with frame-ancestors in CSP but kept for older browsers.
  { key: "X-Frame-Options", value: "DENY" },
  // Prevent MIME-type sniffing.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Control how much referrer information is sent with requests.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Disable browser features that this app does not use.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  { key: "Content-Security-Policy", value: csp },
];

// ─── Next.js config ────────────────────────────────────────────────────────────

const nextConfig: NextConfig = {
  // Apply security headers to all routes EXCEPT NextAuth's own endpoints.
  // /api/auth/* routes are managed by NextAuth — they generate their own
  // sign-in forms and redirect flows that do not need our app's CSP.
  // Including them would block the Google OAuth form submission.
  async headers() {
    return [
      {
        source: "/((?!api/auth).*)",
        headers: securityHeaders,
      },
    ];
  },

  // Allowlist remote image hostnames used by next/image.
  // Cloudinary: photo uploads. Google: OAuth profile pictures.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },

  // Note: typescript.ignoreBuildErrors and eslint.ignoreDuringBuilds both default
  // to false — Next.js already fails the build on type or lint errors by default.
};

export default nextConfig;
