import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.0.181"],
  experimental: {
    serverActions: {
      // The upload+extract action receives multi-page fact-find photos in one
      // request (several MB each on iPhone). Default limit is 1 MB.
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;
