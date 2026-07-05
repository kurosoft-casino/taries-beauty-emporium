const { initOpenNextCloudflareForDev } = require('@opennextjs/cloudflare')

/** @type {import('next').NextConfig} */
const isStaticExport = process.env.STATIC_EXPORT === 'true'
const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH || ''
const basePath = rawBasePath ? `/${rawBasePath.replace(/^\/+|\/+$/g, '')}` : ''

if (!isStaticExport && process.env.NODE_ENV === 'development') {
  void initOpenNextCloudflareForDev()
}

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
