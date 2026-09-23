import createBundleAnalyzer from "@next/bundle-analyzer";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  output: "standalone",
  async redirects() {
    return [
      {
        source: "/kz",
        destination: "/kk/login",
        permanent: false,
      },
    ];
  },
  async rewrites() {
    const apiOrigin = (
      process.env.API_INTERNAL_URL || "http://127.0.0.1:3001"
    ).replace(/\/$/, "");
    return [{ source: "/api/:path*", destination: `${apiOrigin}/api/:path*` }];
  },
};

const withNextIntl = createNextIntlPlugin(
  "./src/shared/configs/i18/request.ts",
);

const withBundleAnalyzer = createBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

export default withBundleAnalyzer(withNextIntl(nextConfig));
