import 'server-only'

import { getCloudflareContext } from '@opennextjs/cloudflare'

export function getCloudflareEnv(): CloudflareEnv | null {
  try {
    return getCloudflareContext().env as CloudflareEnv
  } catch {
    return null
  }
}

export function requireDatabase(): D1Database {
  const env = getCloudflareEnv()
  if (!env?.DB) {
    throw new Error('Cloudflare D1 binding "DB" is not configured for this environment.')
  }
  return env.DB
}
