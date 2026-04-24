/** @type {import('next').NextConfig} */
const isStaticExport = process.env.STATIC_EXPORT === 'true'

const nextConfig = {
  images: {
    unoptimized: true,
  },
  ...(isStaticExport
    ? {
        output: 'export',
        basePath: '/taries-beauty-emporium',
        assetPrefix: '/taries-beauty-emporium',
        trailingSlash: true,
      }
    : {}),
}

module.exports = nextConfig
