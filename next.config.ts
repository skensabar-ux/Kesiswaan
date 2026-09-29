import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  serverExternalPackages: ["exceljs", "bcryptjs", "@react-pdf/renderer", "qrcode"],
  // Jangan pernah ikut menyertakan data unggahan / rahasia ke output standalone.
  outputFileTracingExcludes: { "*": ["./.git/**", "./.env*", "./uploads/**"] },
  // Font standar PDF dimuat dinamis oleh pdfkit sehingga tidak terdeteksi tracer
  outputFileTracingIncludes: {
    "/api/surat/[id]/pdf": ["./node_modules/pdfkit/js/standard-fonts/**"],
    "/api/public/surat/[token]/pdf": ["./node_modules/pdfkit/js/standard-fonts/**"],
    "/api/laporan/pdf": ["./node_modules/pdfkit/js/standard-fonts/**"],
  },
  experimental: {
    serverActions: { bodySizeLimit: "10mb" },
  },
};

export default nextConfig;
