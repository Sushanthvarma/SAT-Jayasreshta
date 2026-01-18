import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Ensure environment variables are properly loaded
  env: {
    // Explicitly expose NEXT_PUBLIC_* vars (though they should be automatic)
  },
};

export default nextConfig;
