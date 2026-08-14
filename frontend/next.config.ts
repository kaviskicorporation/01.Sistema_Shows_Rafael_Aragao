import type { NextConfig } from "next";

// 127.0.0.1 evita falha de IPv6/localhost no Windows (DisallowedHost / ECONNREFUSED).
const BACKEND = process.env.BACKEND_URL || "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  // Sem isso, abrir o site em http://127.0.0.1:3000 bloqueia /_next/*.js com 403
  // e o login “não funciona” (React não hidrata; form faz GET nativo).
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${BACKEND}/api/:path*` },
      { source: "/media/:path*", destination: `${BACKEND}/media/:path*` },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "orafaelaragao.com.br" },
      { protocol: "http", hostname: "localhost" },
      { protocol: "http", hostname: "127.0.0.1" },
    ],
  },
};

export default nextConfig;
