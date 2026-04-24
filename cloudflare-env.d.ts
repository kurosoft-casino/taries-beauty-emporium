interface D1Result<T = Record<string, unknown>> {
  success: boolean
  results?: T[]
  meta?: Record<string, unknown>
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement
  first<T = Record<string, unknown>>(columnName?: string): Promise<T | null>
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>
  run<T = Record<string, unknown>>(): Promise<D1Result<T>>
}

interface D1Database {
  prepare(query: string): D1PreparedStatement
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<T[]>
  exec(query: string): Promise<unknown>
}

interface KVNamespaceListResult {
  keys: Array<{ name: string }>
}

interface KVNamespace {
  get(key: string, type?: 'text'): Promise<string | null>
  get<T>(key: string, type: 'json'): Promise<T | null>
  put(key: string, value: string, options?: Record<string, unknown>): Promise<void>
  delete(key: string): Promise<void>
  list(options?: Record<string, unknown>): Promise<KVNamespaceListResult>
}

interface R2Bucket {
  put(key: string, value: ReadableStream | ArrayBuffer | ArrayBufferView | string | Blob, options?: Record<string, unknown>): Promise<unknown>
  get(key: string): Promise<unknown>
  delete(key: string): Promise<void>
}

interface Fetcher {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>
}

interface CloudflareEnv {
  ASSETS: Fetcher
  DB: D1Database
  CACHE: KVNamespace
  MEDIA: R2Bucket
}
