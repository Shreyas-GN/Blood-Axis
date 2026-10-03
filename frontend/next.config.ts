import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {},
  outputFileTracingRoot: path.join(__dirname, '../'),
  webpack: (config, { isServer }) => {
    // Webpack config can go here if needed in the future
    return config;
  }
};

export default nextConfig;
