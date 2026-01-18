import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Ensure environment variables are properly loaded
  env: {
    // Explicitly expose NEXT_PUBLIC_* vars (though they should be automatic)
  },
  // Configure headers to allow Firebase Auth popup
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
