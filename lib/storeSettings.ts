import { readJSON, readText, writeJSON, writeText } from './storage'

export interface StoreSettings {
  storeName: string
  whatsapp: string
  email: string
  announcement: string
}

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  storeName: 'Taries Beauty Emporium',
  whatsapp: '+234 903 541 2919',
  email: 'tariesbeautyemporium@gmail.com',
  announcement: '',
}

const SETTINGS_KEY = 'taries-store-settings'
const MAINTENANCE_KEY = 'taries-maintenance'
const EVENT_NAME = 'taries-store-settings-updated'

export function getStoreSettings(): StoreSettings {
  return {
    ...DEFAULT_STORE_SETTINGS,
    ...readJSON<Partial<StoreSettings>>(SETTINGS_KEY, {}),
  }
}

export function saveStoreSettings(settings: StoreSettings): boolean {
  const ok = writeJSON(SETTINGS_KEY, settings)
  if (ok && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENT_NAME))
  }
  return ok
}

export function getMaintenanceMode(): boolean {
  return readText(MAINTENANCE_KEY) === '1'
}

export function saveMaintenanceMode(enabled: boolean): boolean {
  const ok = writeText(MAINTENANCE_KEY, enabled ? '1' : '0')
  if (ok && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENT_NAME))
  }
  return ok
}

export function subscribeStoreSettings(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(EVENT_NAME, listener)
  window.addEventListener('storage', listener)
  return () => {
    window.removeEventListener(EVENT_NAME, listener)
    window.removeEventListener('storage', listener)
  }
}
