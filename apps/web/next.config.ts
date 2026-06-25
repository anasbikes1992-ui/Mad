import type { NextConfig } from 'next'

const config: NextConfig = {
  experimental: {
    serverActions: { allowedOrigins: ['localhost:3000', 'madeenas.vercel.app'] },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  transpilePackages: ['@madeenas/db', '@madeenas/ui'],
}

export default config
