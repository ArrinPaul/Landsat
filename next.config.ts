import type {NextConfig} from 'next';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
(process.env as Record<string, string | undefined>).NODE_ENV = 'production';
const nextConfig: NextConfig = {
  /* config options here */
  // react-leaflet's MapContainer (used by the boundary-drawing map) throws "Map container is
  // already initialized" under React 18 Strict Mode's dev-only double-invoked effects - a known
  // react-leaflet limitation, not a bug in this app's code. Strict Mode's extra checks never run
  // in production builds regardless, so this only affects the dev double-render safety net.
  reactStrictMode: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
