/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@hello-pangea/dnd'],
  typescript: {
    ignoreBuildErrors: true,
  },
}

export default nextConfig
