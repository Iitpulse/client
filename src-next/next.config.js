// = PHASE_DEVELOPMENT_SERVER from next/constants
const PHASE_DEVELOPMENT_SERVER = 'phase-development-server';

/** @type {(phase: string) => import('next').NextConfig} */
module.exports = (phase) => ({
  reactStrictMode: true,
  // Enable standalone output for Docker deployment
  output: 'standalone',
  // "*.dev.tsx" pages exist only under `next dev` (the /_kitchen-sink route): a production build has no such route.
  pageExtensions:
    phase === PHASE_DEVELOPMENT_SERVER
      ? ['dev.tsx', 'tsx', 'ts', 'jsx', 'js']
      : ['tsx', 'ts', 'jsx', 'js'],
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
});
