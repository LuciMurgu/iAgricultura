/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output for Docker deployment (prod only — breaks dev static serving)
  ...(process.env.NODE_ENV === "production" ? { output: "standalone" } : {}),

  // Security headers (disabled in dev to avoid CSP issues)
  ...(process.env.NODE_ENV === "production"
    ? {
        async headers() {
          return [
            {
              source: "/(.*)",
              headers: [
                { key: "X-Content-Type-Options", value: "nosniff" },
                { key: "X-Frame-Options", value: "DENY" },
                { key: "X-XSS-Protection", value: "1; mode=block" },
                { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
                {
                  key: "Content-Security-Policy",
                  value: [
                    "default-src 'self'",
                    "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
                    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
                    "font-src 'self' https://fonts.gstatic.com",
                    "img-src 'self' data: blob:",
                    "connect-src 'self' " + (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"),
                  ].join("; "),
                },
              ],
            },
          ];
        },
      }
    : {}),
};

module.exports = nextConfig;
