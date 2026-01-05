import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "doctor-on-call-main.s3.ap-southeast-2.amazonaws.com",
      },
    ],
  },
};

export default nextConfig;
