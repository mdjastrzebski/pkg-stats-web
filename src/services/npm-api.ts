import type { DownloadData } from "../types"
import { FetchError } from "../types"
import { TaskScheduler } from "../scheduler"

const API_BASE =
  import.meta.env.VITE_NPM_API_BASE_URL ||
  "https://api.npmjs.org/downloads/range"
const SEARCH_API_BASE =
  import.meta.env.VITE_NPM_SEARCH_API_BASE_URL ||
  "https://registry.npmjs.org/-/v1/search"

const CACHE_EXPIRY_HOURS = 6
const CACHE_EXPIRY_MS = CACHE_EXPIRY_HOURS * 60 * 60 * 1000
const CACHE_PREFIX = "npm_stats_cache_"
const CACHE_CLEANUP_PERCENTAGE = 0.5

const MAX_CONCURRENT_REQUESTS = 6

const scheduler = new TaskScheduler({
  maxConcurrent: MAX_CONCURRENT_REQUESTS,
})

const DAYS_PER_WEEK = 7
const DAYS_PER_MONTH = 30
const DAYS_PER_YEAR = 365
const DAYS_OFFSET_WEEK = DAYS_PER_WEEK - 1
const DAYS_OFFSET_MONTH = DAYS_PER_MONTH - 1
const DAYS_OFFSET_YEAR = DAYS_PER_YEAR - 1

export interface DateRange {
  start: string
  end: string
}

async function throttledFetch<T>(
  fn: () => Promise<T>,
  priority: number = 0,
): Promise<T> {
  return scheduler.schedule(fn, { priority })
}

interface CachedStats {
  data: {
    currentWeekDownloads: number | null
    previousWeekDownloads: number | null
    currentMonthDownloads: number | null
    previousMonthDownloads: number | null
    currentYearDownloads: number | null
    previousYearDownloads: number | null
  }
  timestamp: number
}

function getFullDataRange(): DateRange {
  const end = new Date()
  end.setDate(end.getDate() - 1)
  const start = new Date(end)
  start.setDate(start.getDate() - (DAYS_PER_YEAR * 2 - 1))

  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  }
}

function calculateStatsFromDailyData(
  dailyData: Array<{ downloads: number day: string }>,
): {
  currentWeekDownloads: number | null
  previousWeekDownloads: number | null
  currentMonthDownloads: number | null
  previousMonthDownloads: number | null
  currentYearDownloads: number | null
  previousYearDownloads: number | null
} {
  if (!dailyData || dailyData.length === 0) {
    return {
      currentWeekDownloads: null,
      previousWeekDownloads: null,
      currentMonthDownloads: null,
      previousMonthDownloads: null,
      currentYearDownloads: null,
      previousYearDownloads: null,
    }
  }

  const sorted = [...dailyData].sort((a, b) => a.day.localeCompare(b.day))
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  yesterday.setHours(0, 0, 0, 0)

  const currentWeekStart = new Date(yesterday)
  currentWeekStart.setDate(currentWeekStart.getDate() - DAYS_OFFSET_WEEK)

  const previousWeekEnd = new Date(currentWeekStart)
  previousWeekEnd.setDate(previousWeekEnd.getDate() - 1)
  const previousWeekStart = new Date(previousWeekEnd)
  previousWeekStart.setDate(previousWeekStart.getDate() - DAYS_OFFSET_WEEK)

  const currentMonthStart = new Date(yesterday)
  currentMonthStart.setDate(currentMonthStart.getDate() - DAYS_OFFSET_MONTH)

  const previousMonthEnd = new Date(currentMonthStart)
  previousMonthEnd.setDate(previousMonthEnd.getDate() - 1)
  const previousMonthStart = new Date(previousMonthEnd)
  previousMonthStart.setDate(previousMonthStart.getDate() - DAYS_OFFSET_MONTH)

  const currentYearStart = new Date(yesterday)
  currentYearStart.setDate(currentYearStart.getDate() - DAYS_OFFSET_YEAR)

  const previousYearEnd = new Date(currentYearStart)
  previousYearEnd.setDate(previousYearEnd.getDate() - 1)
  const previousYearStart = new Date(previousYearEnd)
  previousYearStart.setDate(previousYearStart.getDate() - DAYS_OFFSET_YEAR)

  function sumRange(start: Date, end: Date): number {
    const startStr = start.toISOString().split("T")[0]
    const endStr = end.toISOString().split("T")[0]

    return sorted
      .filter((d) => d.day >= startStr && d.day <= endStr)
      .reduce((sum, d) => sum + d.downloads, 0)
  }

  return {
    currentWeekDownloads: sumRange(currentWeekStart, yesterday),
    previousWeekDownloads: sumRange(previousWeekStart, previousWeekEnd),
    currentMonthDownloads: sumRange(currentMonthStart, yesterday),
    previousMonthDownloads: sumRange(previousMonthStart, previousMonthEnd),
    currentYearDownloads: sumRange(currentYearStart, yesterday),
    previousYearDownloads: sumRange(previousYearStart, previousYearEnd),
  }
}

function getCacheKey(packageName: string): string {
  return `${CACHE_PREFIX}${packageName}`
}

function getCachedStatsWithValidity(packageName: string): CachedStats | null {
  try {
    const cacheKey = getCacheKey(packageName)
    const cached = localStorage.getItem(cacheKey)

    if (!cached) {
      return null
    }

    const cachedStats: CachedStats = JSON.parse(cached)
    return cachedStats
  } catch (error) {
    console.warn("Error reading cache:", error)
    return null
  }
}

function setCachedStats(
  packageName: string,
  data: CachedStats["data"],
  timestamp?: number,
): void {
  const cacheKey = getCacheKey(packageName)
  const cachedStats: CachedStats = {
    data,
    timestamp: timestamp ?? Date.now(),
  }

  try {
    localStorage.setItem(cacheKey, JSON.stringify(cachedStats))
  } catch (error) {
    if (error instanceof DOMException && error.name === "QuotaExceededError") {
      console.warn("LocalStorage quota exceeded. Clearing old cache entries...")
      try {
        const keys = Object.keys(localStorage)
        const cacheKeys = keys.filter((key) => key.startsWith(CACHE_PREFIX))
        const entries = cacheKeys
          .map((key) => {
            try {
              const cached = localStorage.getItem(key)
              if (cached) {
                const parsed: CachedStats = JSON.parse(cached)
                return { key, timestamp: parsed.timestamp }
              }
            } catch {
              return null
            }
            return null
          })
          .filter((entry) => entry !== null)

        entries.sort((a, b) => a.timestamp - b.timestamp)
        const toRemove = Math.ceil(entries.length * CACHE_CLEANUP_PERCENTAGE)
        entries.slice(0, toRemove).forEach((entry) => {
          localStorage.removeItem(entry.key)
        })

        try {
          localStorage.setItem(cacheKey, JSON.stringify(cachedStats))
        } catch (retryError) {
          console.warn("Failed to cache after cleanup:", retryError)
        }
      } catch (cleanupError) {
        console.warn("Failed to cleanup cache:", cleanupError)
      }
    } else {
      console.warn("Error writing to cache:", error)
    }
  }
}

async function fetchDownloads(
  packageName: string,
  start: string,
  end: string,
  priority: number = 0,
): Promise<DownloadData> {
  return throttledFetch(async () => {
    const url = `${API_BASE}/${start}:${end}/${packageName}`
    const response = await fetch(url)

    if (!response.ok) {
      const status = response.status
      const statusText = response.statusText

      if (status === 404) {
        throw new FetchError(
          `Package "${packageName}" not found. Please check the package name and try again.`,
          status,
          response,
        )
      }
      if (status === 429) {
        throw new FetchError(
          `Rate limit exceeded (HTTP ${status}). The NPM API has rate limits. Please wait a moment and try again.`,
          status,
          response,
        )
      }
      if (status >= 500) {
        throw new FetchError(
          `NPM API server error (HTTP ${status} ${statusText}). The service may be temporarily unavailable. Please try again later.`,
          status,
          response,
        )
      }
      throw new FetchError(
        `Failed to fetch download statistics for "${packageName}" (HTTP ${status} ${statusText}). Please try again later.`,
        status,
        response,
      )
    }

    return response.json()
  }, priority)
}

export function clearPackageCache(packageName: string): void {
  try {
    const cacheKey = getCacheKey(packageName)
    localStorage.removeItem(cacheKey)
  } catch (error) {
    console.warn("Error clearing cache:", error)
  }
}

export function clearAllCache(): void {
  try {
    const keys = Object.keys(localStorage)
    keys.forEach((key) => {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key)
      }
    })
  } catch (error) {
    console.warn("Error clearing all cache:", error)
  }
}

async function fetchDownloadsSafely(
  packageName: string,
  start: string,
  end: string,
  priority: number = 0,
): Promise<DownloadData | null> {
  try {
    return await fetchDownloads(packageName, start, end, priority)
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error"
    console.warn(
      `Failed to fetch downloads for "${packageName}" (${start} to ${end}): ${errorMessage}`,
    )
    return null
  }
}

const PRIORITY_CURRENT = 40

export async function getPackageStats(
  packageName: string,
  forceRefresh: boolean = false,
): Promise<{
  currentWeekDownloads: number | null
  previousWeekDownloads: number | null
  currentMonthDownloads: number | null
  previousMonthDownloads: number | null
  currentYearDownloads: number | null
  previousYearDownloads: number | null
}> {
  if (forceRefresh) {
    clearPackageCache(packageName)
  }

  const cached = getCachedStatsWithValidity(packageName)
  const now = Date.now()
  const isCacheValid = cached && now - cached.timestamp < CACHE_EXPIRY_MS

  if (isCacheValid && cached) {
    return cached.data
  }

  const range = getFullDataRange()
  const dailyData = await fetchDownloadsSafely(
    packageName,
    range.start,
    range.end,
    PRIORITY_CURRENT,
  )

  const stats = calculateStatsFromDailyData(dailyData?.downloads || [])

  const hasAnySuccess = Object.values(stats).some((v) => v !== null)
  if (hasAnySuccess) {
    setCachedStats(packageName, stats)
  }

  return stats
}

export interface PackageSearchResult {
  name: string
  description?: string
}

export interface PackageSearchResponse {
  objects: Array<{
    package: {
      name: string
      description?: string
    }
  }>
}

export async function searchPackages(
  query: string,
  limit: number = 10,
): Promise<PackageSearchResult[]> {
  if (!query.trim()) {
    return []
  }

  return throttledFetch(async () => {
    const url = `${SEARCH_API_BASE}?text=${encodeURIComponent(
      query,
    )}&size=${limit}`
    const response = await fetch(url)

    if (!response.ok) {
      console.warn(`Failed to search packages: ${response.status}`)
      return []
    }

    const data: PackageSearchResponse = await response.json()
    return data.objects.map((obj) => ({
      name: obj.package.name,
      description: obj.package.description,
    }))
  })
}
