const DEFAULT_SITE_URL = 'https://www.tariesbeauty.com'

const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH || ''
export const BASE_PATH = rawBasePath ? `/${rawBasePath.replace(/^\/+|\/+$/g, '')}` : ''

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL).replace(/\/+$/, '')

export function withBasePath(path: string): string {
  if (!path.startsWith('/')) {
    return path
  }
  return BASE_PATH ? `${BASE_PATH}${path}` : path
}
