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

interface SessionProbePayload {
  user?: unknown | null
  sessionToken?: string | null
}

const API_SESSION_TOKEN_KEY = 'taries-api-session-token'
const SESSION_EXPIRED_ERROR = 'Your session expired. Please sign in again.'

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

function writeApiSessionToken(token: string | null | undefined): void {
  if (typeof window === 'undefined') return
  try {
    if (token && token.trim()) localStorage.setItem(API_SESSION_TOKEN_KEY, token.trim())
    else localStorage.removeItem(API_SESSION_TOKEN_KEY)
  } catch {
    // ignore storage write errors
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
  await fetch(withApiBase('/auth/csrf'), {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
  }).catch(() => undefined)
}

function toApiError(payload: ApiErrorPayload | null, status: number): string {
  if (payload?.error) {
    return payload.error === 'unauthenticated' ? SESSION_EXPIRED_ERROR : payload.error
  }
  if (status === 401) return SESSION_EXPIRED_ERROR
  return `Request failed (${status})`
}

async function performRequest(
  path: string,
  init: RequestInit | undefined,
  method: string,
  apiSessionToken: string | null,
  csrfEnabled: boolean,
): Promise<Response> {
  await bootstrapCsrfIfMissing(csrfEnabled)

  const makeRequest = () =>
    fetch(withApiBase(path), {
      credentials: 'include',
      cache: 'no-store',
      ...init,
      method,
      headers: mergeHeaders(init?.headers, csrfEnabled, apiSessionToken, init?.body),
    })

  let response = await makeRequest()
  if (response.status !== 403 || !csrfEnabled) return response

  const firstPayload = await response.json().catch(() => null) as ApiErrorPayload | null
  if (firstPayload?.error !== 'csrf token mismatch') {
    return new Response(JSON.stringify(firstPayload ?? { error: `Request failed (${response.status})` }), {
      status: response.status,
      headers: { 'content-type': 'application/json' },
    })
  }

  await fetch(withApiBase('/auth/csrf'), {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
  }).catch(() => undefined)

  response = await makeRequest()
  return response
}

async function restoreApiSessionFromServer(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  try {
    const response = await fetch(withApiBase('/auth/me'), {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    })
    if (!response.ok) return false
    const payload = await response.json().catch(() => null) as SessionProbePayload | null
    if (payload?.sessionToken) {
      writeApiSessionToken(payload.sessionToken)
    }
    if (!payload?.user) {
      writeApiSessionToken(null)
      return false
    }
    return true
  } catch {
    return false
  }
}

export async function apiRequest<T = unknown>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  const method = (init?.method ?? 'GET').toUpperCase()
  try {
    let apiSessionToken = readApiSessionToken()
    let csrfEnabled = shouldAttachCsrf(path, method, Boolean(apiSessionToken))
    let response = await performRequest(path, init, method, apiSessionToken, csrfEnabled)

    if (response.status === 401 && !path.startsWith('/auth/')) {
      const restored = await restoreApiSessionFromServer()
      if (restored) {
        apiSessionToken = readApiSessionToken()
        csrfEnabled = shouldAttachCsrf(path, method, Boolean(apiSessionToken))
        response = await performRequest(path, init, method, apiSessionToken, csrfEnabled)
      }
    }

    const payload = await response.json().catch(() => null) as T | ApiErrorPayload | null
    if (!response.ok) {
      const errorPayload =
        payload && typeof payload === 'object' && 'error' in payload
          ? payload as ApiErrorPayload
          : null
      return { ok: false, status: response.status, data: null, error: toApiError(errorPayload, response.status) }
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
