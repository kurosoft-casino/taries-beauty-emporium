/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/taries-beauty-emporium',
  assetPrefix: '/taries-beauty-emporium',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
