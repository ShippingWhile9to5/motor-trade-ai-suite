import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.0.181"],
  experimental: {
    serverActions: {
      // Policy schedule PDFs are typically a few hundred KB to a couple MB.
      // Default limit is 1 MB.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
