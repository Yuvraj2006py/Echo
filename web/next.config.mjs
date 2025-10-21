/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    externalDir: true
  },
  typescript: {
    ignoreBuildErrors: false
  }
};

export default nextConfig;
