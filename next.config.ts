import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "prisma"],
  allowedDevOrigins: ["*.exe.xyz", "*.exe.dev"],
};

export default nextConfig;
