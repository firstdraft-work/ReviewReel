import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
      {
        protocol: "https",
        hostname: "*.up.railway.app",
      },
    ],
  },
};

export default nextConfig;
