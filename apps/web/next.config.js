/**
 * @returns {import('next').NextConfig}
 */
module.exports = () => {
  const isProd = process.env.NODE_ENV === "production";
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  // `next build` runs via the "build" npm script; lint/type-check use others.
  const isBuild = process.env.npm_lifecycle_event === "build";

  // The API origin must be configured for the real build. Failing the build is
  // better than silently shipping a CSP that points the SPA at localhost.
  if (isBuild && isProd && !apiUrl) {
    throw new Error(
      "NEXT_PUBLIC_API_URL must be set for production builds " +
        "(e.g. https://api.iagricultura.ro). Set it in the Vercel project env.",
    );
  }

  return {
    // Standalone output for Docker deployment (prod only — breaks dev static serving)
    ...(isProd ? { output: "standalone" } : {}),

    // Security headers (disabled in dev to avoid CSP issues)
    ...(isProd
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
                      "connect-src 'self' " + (apiUrl || "http://localhost:8000"),
                    ].join("; "),
                  },
                ],
              },
            ];
          },
        }
      : {}),
  };
};
