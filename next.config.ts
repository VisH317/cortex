import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse"],
  experimental: {
    serverComponentsExternalPackages: ["pdf-parse"]
  },
  /* config options here */
  reactCompiler: true,
};

export default nextConfig;
