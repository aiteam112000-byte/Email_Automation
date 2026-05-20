import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "http://192.168.0.15:3000",
    "http://172.18.128.1:3000",
    "192.168.0.15",
    "172.18.128.1",
  ],
};

export default nextConfig;
