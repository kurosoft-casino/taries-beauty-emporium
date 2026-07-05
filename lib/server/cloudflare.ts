import 'server-only'

import { getCloudflareContext } from '@opennextjs/cloudflare'

export async function getCloudflareEnv(): Promise<CloudflareEnv | null> {
  try {
    return getCloudflareContext().env as CloudflareEnv
  } catch {
    try {
      return (await getCloudflareContext({ async: true })).env as CloudflareEnv
    } catch {
      return null
    }
  }
}

export async function requireDatabase(): Promise<D1Database> {
  const env = await getCloudflareEnv()
  if (!env?.DB) {
    throw new Error('Cloudflare D1 binding "DB" is not configured for this environment.')
  }
  return env.DB
}
