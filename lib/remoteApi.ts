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

const API_SESSION_TOKEN_KEY = 'taries-api-session-token'

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const cookie = document.cookie
    .split(';')
    .map(entry => entry.trim())
    .find(entry => entry.startsWith(`${name}=`))
  if (!cookie) return null
  return decodeURIComponent(cookie.slice(name.length + 1))
}

function readApiSessionToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const token = localStorage.getItem(API_SESSION_TOKEN_KEY)
    return token && token.trim() ? token.trim() : null
  } catch {
    return null
  }
}

function shouldAttachCsrf(path: string, method: string, hasBearerToken: boolean): boolean {
  if (hasBearerToken) return false
  const upper = method.toUpperCase()
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(upper)) return false
  return !(
    path.startsWith('/auth/login') ||
    path.startsWith('/auth/register') ||
    path.startsWith('/auth/logout')
  )
}

function mergeHeaders(
  initHeaders: HeadersInit | undefined,
  csrfEnabled: boolean,
  apiSessionToken: string | null,
  body: BodyInit | null | undefined,
): Headers {
  const headers = new Headers(initHeaders ?? {})
  if (!(body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (apiSessionToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${apiSessionToken}`)
  }
  if (csrfEnabled) {
    const csrf = readCookie('tbe_csrf')
    if (csrf) headers.set('x-csrf-token', csrf)
  }
  return headers
}

async function bootstrapCsrfIfMissing(csrfEnabled: boolean): Promise<void> {
  if (typeof window === 'undefined') return
  if (!csrfEnabled) return
  if (readCookie('tbe_csrf')) return
  await fetch(withApiBase('/auth/csrf'), { method: 'GET', credentials: 'include', cache: 'no-store' }).catch(() => undefined)
}

export async function apiRequest<T = unknown>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  const method = (init?.method ?? 'GET').toUpperCase()
  const apiSessionToken = readApiSessionToken()
  const csrfEnabled = shouldAttachCsrf(path, method, Boolean(apiSessionToken))
  try {
    await bootstrapCsrfIfMissing(csrfEnabled)
    let response = await fetch(withApiBase(path), {
      credentials: 'include',
      cache: 'no-store',
        ...init,
        method,
        headers: mergeHeaders(init?.headers, csrfEnabled, apiSessionToken, init?.body),
      })
    if (response.status === 403 && csrfEnabled) {
      const firstPayload = await response.json().catch(() => null) as ApiErrorPayload | null
      if (firstPayload?.error === 'csrf token mismatch') {
        await fetch(withApiBase('/auth/csrf'), { method: 'GET', credentials: 'include', cache: 'no-store' }).catch(() => undefined)
        response = await fetch(withApiBase(path), {
          credentials: 'include',
          cache: 'no-store',
          ...init,
          method,
          headers: mergeHeaders(init?.headers, csrfEnabled, apiSessionToken, init?.body),
        })
      } else {
        const err =
          firstPayload && typeof firstPayload.error === 'string'
            ? firstPayload.error
            : `Request failed (${response.status})`
        return { ok: false, status: response.status, data: null, error: err }
      }
    }
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
