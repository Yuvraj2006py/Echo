/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: true,
    externalDir: true
  },
  typescript: {
    ignoreBuildErrors: false
  }
};

export default nextConfig;
