import { browser } from '../shared/browser-polyfill'
import { STORAGE_KEYS, CACHE_TTL_MS } from '../shared/constants'

interface CacheEntry {
  keyword: string
  data: unknown
  cachedAt: number
}

/**
 * Get cached data for a keyword. Returns null if expired or not found.
 */
export async function getCache(keyword: string): Promise<CacheEntry | null> {
  const result = await browser.storage.local.get(STORAGE_KEYS.CACHE)
  const cache = (result[STORAGE_KEYS.CACHE] as Record<string, CacheEntry>) || {}
  const entry = cache[keyword]

  if (!entry) return null

  // Check TTL
  const settings = await browser.storage.local.get(STORAGE_KEYS.SETTINGS)
  const ttl = (settings[STORAGE_KEYS.SETTINGS] as { cacheTtlHours?: number } | undefined)?.cacheTtlHours
  const ttlMs = (ttl || 24) * 60 * 60 * 1000

  if (Date.now() - entry.cachedAt > ttlMs) {
    // Expired, remove it
    delete cache[keyword]
    await browser.storage.local.set({ [STORAGE_KEYS.CACHE]: cache })
    return null
  }

  return entry
}

/**
 * Set cached data for a keyword.
 */
export async function setCache(keyword: string, data: unknown): Promise<void> {
  const result = await browser.storage.local.get(STORAGE_KEYS.CACHE)
  const cache = (result[STORAGE_KEYS.CACHE] as Record<string, CacheEntry>) || {}

  cache[keyword] = {
    keyword,
    data,
    cachedAt: Date.now(),
  }

  // Cleanup old entries (keep last 100)
  const keys = Object.keys(cache)
  if (keys.length > 100) {
    const sorted = keys.sort((a, b) => cache[b].cachedAt - cache[a].cachedAt)
    for (const k of sorted.slice(100)) {
      delete cache[k]
    }
  }

  await browser.storage.local.set({ [STORAGE_KEYS.CACHE]: cache })
}

/**
 * Clear all cached data.
 */
export async function clearAllCache(): Promise<void> {
  await browser.storage.local.set({ [STORAGE_KEYS.CACHE]: {} })
}
