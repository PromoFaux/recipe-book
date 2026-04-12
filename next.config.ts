import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["sharp", "@prisma/client", "prisma"],
  images: {
    // Photos are served through our authenticated /uploads route handler,
    // so no remote patterns needed here.
    remotePatterns: [
      {
        // Google profile photos (for user avatars in the nav)
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
};

export default nextConfig;
