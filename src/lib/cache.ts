// Simple in-memory cache for performance optimization
interface CacheItem<T> {
  data: T
  timestamp: number
  ttl: number // Time to live in milliseconds
}

class DataCache {
  private cache = new Map<string, CacheItem<any>>()
  private defaultTTL = 5 * 60 * 1000 // 5 minutes

  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    })
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key)
    if (!item) return null

    const now = Date.now()
    if (now - item.timestamp > item.ttl) {
      this.cache.delete(key)
      return null
    }

    return item.data
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  // Invalidate cache entries that match a pattern
  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern)
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key)
      }
    }
  }

  // Get cache stats
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    }
  }
}

export const dataCache = new DataCache()

// Cache keys
export const CACHE_KEYS = {
  AREAS: 'areas',
  PODS: 'pods',
  MEMBERS: 'members',
  AVAILABLE_MEMBERS: 'available_members',
  POD_COMMITTEE_MEMBERS: 'pod_committee_members',
  AREA_REVISED_DATES: 'area_revised_dates',
  USER: 'current_user',
  MY_PODS: 'my_pods'
} as const

// Helper function to create cache key with parameters
export function createCacheKey(baseKey: string, params?: Record<string, any>): string {
  if (!params) return baseKey
  const paramString = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}:${value}`)
    .join('|')
  return `${baseKey}:${paramString}`
}
