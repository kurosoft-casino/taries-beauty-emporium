export function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch (error) {
    console.error(`Failed to read localStorage key "${key}"`, error)
    return fallback
  }
}

export function writeJSON<T>(key: string, value: T): boolean {
  if (typeof window === 'undefined') return false
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (error) {
    console.error(`Failed to write localStorage key "${key}"`, error)
    return false
  }
}

export function readText(key: string, fallback = ''): string {
  if (typeof window === 'undefined') return fallback
  try {
    return localStorage.getItem(key) ?? fallback
  } catch (error) {
    console.error(`Failed to read localStorage key "${key}"`, error)
    return fallback
  }
}

export function writeText(key: string, value: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    localStorage.setItem(key, value)
    return true
  } catch (error) {
    console.error(`Failed to write localStorage key "${key}"`, error)
    return false
  }
}

export function removeKey(key: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    localStorage.removeItem(key)
    return true
  } catch (error) {
    console.error(`Failed to remove localStorage key "${key}"`, error)
    return false
  }
}
