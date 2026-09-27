import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  serverExternalPackages: ["exceljs", "bcryptjs"],
  // Jangan pernah ikut menyertakan data unggahan / rahasia ke output standalone.
  outputFileTracingExcludes: { "*": ["./.git/**", "./.env*", "./uploads/**"] },
  experimental: {
    serverActions: { bodySizeLimit: "10mb" },
  },
};

export default nextConfig;
