import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse"],
  experimental: {
    serverComponentsExternalPackages: ["pdf-parse"]
  },
  /* config options here */
  reactCompiler: true,
  turbopack: {
    resolveAlias: {
      // Ensure react-markdown works correctly
      'react-markdown': 'react-markdown',
    },
  },
};

export default nextConfig;
