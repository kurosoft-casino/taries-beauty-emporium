import { withApiBase } from './site'

export interface ApiErrorPayload {
  error?: string
}

export interface ApiResult<T> {
  ok: boolean
  status: number
  data: T | null
  error: string | null
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const cookie = document.cookie
    .split(';')
    .map(entry => entry.trim())
    .find(entry => entry.startsWith(`${name}=`))
  if (!cookie) return null
  return decodeURIComponent(cookie.slice(name.length + 1))
}

function shouldAttachCsrf(path: string, method: string): boolean {
  const upper = method.toUpperCase()
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(upper)) return false
  return !(
    path.startsWith('/auth/login') ||
    path.startsWith('/auth/register') ||
    path.startsWith('/auth/logout')
  )
}

function mergeHeaders(initHeaders: HeadersInit | undefined, path: string, method: string): Headers {
  const headers = new Headers(initHeaders ?? {})
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (shouldAttachCsrf(path, method)) {
    const csrf = readCookie('tbe_csrf')
    if (csrf) headers.set('x-csrf-token', csrf)
  }
  return headers
}

export async function apiRequest<T = unknown>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  const method = (init?.method ?? 'GET').toUpperCase()
  try {
    const response = await fetch(withApiBase(path), {
      credentials: 'include',
      cache: 'no-store',
      ...init,
      method,
      headers: mergeHeaders(init?.headers, path, method),
    })
    const payload = await response.json().catch(() => null) as T | ApiErrorPayload | null
    if (!response.ok) {
      const err =
        payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
          ? payload.error
          : `Request failed (${response.status})`
      return { ok: false, status: response.status, data: null, error: err }
    }
    return { ok: true, status: response.status, data: payload as T, error: null }
  } catch {
    return { ok: false, status: 0, data: null, error: 'Network error' }
  }
}

export async function apiJson<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const result = await apiRequest<T>(path, init)
  if (!result.ok || !result.data) {
    throw new Error(result.error ?? 'Request failed')
  }
  return result.data
}
