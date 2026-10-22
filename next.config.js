/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3'],
  },
  images: {
    domains: ['images.unsplash.com', 'picsum.photos'],
  },
};

module.exports = nextConfig;
