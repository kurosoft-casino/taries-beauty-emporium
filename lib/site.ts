const DEFAULT_SITE_URL = 'https://www.tariesbeauty.com'
const DEFAULT_API_BASE_URL = '/api'

const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH || ''
export const BASE_PATH = rawBasePath ? `/${rawBasePath.replace(/^\/+|\/+$/g, '')}` : ''

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL).replace(/\/+$/, '')
export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  DEFAULT_API_BASE_URL
).replace(/\/+$/, '')

export function withBasePath(path: string): string {
  if (!path.startsWith('/')) {
    return path
  }
  return BASE_PATH ? `${BASE_PATH}${path}` : path
}

export function withApiBase(path: string): string {
  if (!path.startsWith('/')) return path
  return API_BASE_URL ? `${API_BASE_URL}${path}` : path
}
