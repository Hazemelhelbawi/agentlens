import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@agentlens/core",
    "@agentlens/shared",
    "@agentlens/crawler",
    "@agentlens/analyzer",
    "@agentlens/scoring",
  ],
};

export default nextConfig;
