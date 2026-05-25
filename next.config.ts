import type { NextConfig } from "next";

const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' blob: data:",
      "font-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "upgrade-insecure-requests",
    ].join("; "),
  },
]

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ]
  },
  async redirects() {
    return [
      // Redirect old auth routes to new /auth-prefixed routes
      {
        source: '/login',
        destination: '/auth/login',
        permanent: false,
      },
      {
        source: '/signup',
        destination: '/auth/signup',
        permanent: false,
      },
      {
        source: '/forgot-password',
        destination: '/auth/forgot-password',
        permanent: false,
      },
      {
        source: '/reset-password',
        destination: '/auth/reset-password',
        permanent: false,
      },
      // Redirect old dashboard routes to new /dashboard-prefixed routes
      {
        source: '/driver',
        destination: '/dashboard/driver',
        permanent: false,
      },
      {
        source: '/manager',
        destination: '/dashboard/manager',
        permanent: false,
      },
      {
        source: '/board',
        destination: '/dashboard/board',
        permanent: false,
      },
    ]
  },
}

export default nextConfig
