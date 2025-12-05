/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Enable if you need to use images from external sources
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // Redirect root to dashboard if needed
  async redirects() {
    return [];
  },
};

module.exports = nextConfig;
