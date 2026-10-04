import 'server-only'

/**
 * PocketBase client for server-side use only.
 *
 * Talks to the self-hosted PocketBase instance (VPS) with a dedicated
 * superuser service account. Never expose this module to the browser:
 * the token grants full admin access.
 */

export const PB_COLLECTIONS = {
  users: 'tbe_users',
  userAddresses: 'tbe_user_addresses',
  sessions: 'tbe_sessions',
  vendors: 'tbe_vendors',
  vendorProducts: 'tbe_vendor_products',
  productOverrides: 'tbe_product_overrides',
  orders: 'tbe_orders',
  orderItems: 'tbe_order_items',
  newsletterSubscribers: 'tbe_newsletter_subscribers',
  stockAlertRequests: 'tbe_stock_alert_requests',
  mediaAssets: 'tbe_media_assets',
  storeSettings: 'tbe_store_settings',
  chatThreads: 'tbe_chat_threads',
  chatMessages: 'tbe_chat_messages',
  presenceHeartbeats: 'tbe_presence_heartbeats',
} as const

export type PBCollectionName = (typeof PB_COLLECTIONS)[keyof typeof PB_COLLECTIONS]

export interface PBRecord {
  id: string
  collectionId: string
  collectionName: string
  created: string
  updated: string
  [key: string]: unknown
}

export interface PBListResult<T = PBRecord> {
  page: number
  perPage: number
  totalItems: number
  totalPages: number
  items: T[]
}

export interface PBListOptions {
  filter?: string
  sort?: string
  page?: number
  perPage?: number
  fields?: string
  expand?: string
}

export class PocketBaseError extends Error {
  status: number
  details: unknown
  constructor(message: string, status: number, details: unknown) {
    super(message)
    this.name = 'PocketBaseError'
    this.status = status
    this.details = details
  }
}

function config(): { url: string; email: string; password: string } {
  const url = process.env.PB_URL
  const email = process.env.PB_SUPERUSER_EMAIL
  const password = process.env.PB_SUPERUSER_PASSWORD
  if (!url || !email || !password) {
    throw new Error(
      'PocketBase is not configured. Set PB_URL, PB_SUPERUSER_EMAIL and PB_SUPERUSER_PASSWORD (server-side env).',
    )
  }
  return { url: url.replace(/\/+$/, ''), email, password }
}

let cachedToken: { token: string; expiresAt: number } | null = null

async function authenticate(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.token
  }
  const { url, email, password } = config()
  const res = await fetch(`${url}/api/collections/_superusers/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: email, password }),
    cache: 'no-store',
  })
  if (!res.ok) {
    throw new PocketBaseError(`PocketBase authentication failed (${res.status})`, res.status, await safeJson(res))
  }
  const data = (await res.json()) as { token?: string }
  if (!data.token) {
    throw new PocketBaseError('PocketBase authentication returned no token', 500, data)
  }
  cachedToken = { token: data.token, expiresAt: Date.now() + 10 * 60 * 1000 }
  return data.token
}

async function safeJson(res: Response): Promise<unknown> {
  try {
    return await res.json()
  } catch {
    return null
  }
}

async function request<T>(method: string, path: string, body?: unknown, retried = false): Promise<T> {
  const { url } = config()
  const token = await authenticate()
  const res = await fetch(`${url}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })

  if (res.status === 401 && !retried) {
    cachedToken = null
    return request<T>(method, path, body, true)
  }

  if (!res.ok) {
    const details = await safeJson(res)
    const message =
      details && typeof details === 'object' && 'message' in details
        ? String((details as { message: unknown }).message)
        : `PocketBase request failed (${res.status})`
    throw new PocketBaseError(message, res.status, details)
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

/** Escape a value for use inside a PocketBase filter string. */
export function pbQuote(value: string): string {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
}

function toQueryString(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value))
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

export async function pbList<T = PBRecord>(
  collection: PBCollectionName | string,
  options: PBListOptions = {},
): Promise<PBListResult<T>> {
  const qs = toQueryString({
    page: options.page ?? 1,
    perPage: options.perPage ?? 100,
    filter: options.filter,
    sort: options.sort,
    fields: options.fields,
    expand: options.expand,
  })
  return request<PBListResult<T>>('GET', `/api/collections/${collection}/records${qs}`)
}

/** Fetch every record matching the filter, paginating through all pages. */
export async function pbListAll<T = PBRecord>(
  collection: PBCollectionName | string,
  options: Omit<PBListOptions, 'page'> = {},
): Promise<T[]> {
  const perPage = options.perPage ?? 200
  let page = 1
  const items: T[] = []
  for (;;) {
    const result = await pbList<T>(collection, { ...options, page, perPage })
    items.push(...result.items)
    if (page >= result.totalPages || result.items.length === 0) break
    page += 1
  }
  return items
}

export async function pbFirst<T = PBRecord>(
  collection: PBCollectionName | string,
  filter: string,
  sort?: string,
): Promise<T | null> {
  const result = await pbList<T>(collection, { filter, sort, perPage: 1 })
  return result.items[0] ?? null
}

export async function pbGet<T = PBRecord>(collection: PBCollectionName | string, id: string): Promise<T> {
  return request<T>('GET', `/api/collections/${collection}/records/${id}`)
}

export async function pbCreate<T = PBRecord>(
  collection: PBCollectionName | string,
  data: Record<string, unknown>,
): Promise<T> {
  return request<T>('POST', `/api/collections/${collection}/records`, data)
}

export async function pbUpdate<T = PBRecord>(
  collection: PBCollectionName | string,
  id: string,
  data: Record<string, unknown>,
): Promise<T> {
  return request<T>('PATCH', `/api/collections/${collection}/records/${id}`, data)
}

export async function pbDelete(collection: PBCollectionName | string, id: string): Promise<void> {
  await request<undefined>('DELETE', `/api/collections/${collection}/records/${id}`)
}

/** Delete every record matching a filter (paginated). Returns deleted count. */
export async function pbDeleteWhere(collection: PBCollectionName | string, filter: string): Promise<number> {
  const records = await pbListAll<PBRecord>(collection, { filter })
  for (const record of records) {
    await pbDelete(collection, record.id)
  }
  return records.length
}
