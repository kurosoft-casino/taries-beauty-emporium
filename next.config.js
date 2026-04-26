/** @type {import('next').NextConfig} */
const isStaticExport = process.env.STATIC_EXPORT === 'true'
const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH || ''
const basePath = rawBasePath ? `/${rawBasePath.replace(/^\/+|\/+$/g, '')}` : ''

const nextConfig = {
  images: {
    unoptimized: true,
  },
  ...(isStaticExport
    ? {
        output: 'export',
        trailingSlash: true,
        ...(basePath ? { basePath, assetPrefix: basePath } : {}),
      }
    : {}),
}

module.exports = nextConfig
