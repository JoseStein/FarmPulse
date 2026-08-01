import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  headers: async () => [{ source: "/(.*)", headers: [{ key: "X-Content-Type-Options", value: "nosniff" }, { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" }, { key: "X-Frame-Options", value: "DENY" }, { key: "Permissions-Policy", value: "camera=(self), geolocation=(), microphone=()" }, { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }] }],
};
export default nextConfig;
