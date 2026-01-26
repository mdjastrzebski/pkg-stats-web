import type { DownloadData } from '../types';

const API_BASE = 'https://api.npmjs.org/downloads/range';
const CACHE_EXPIRY_MS = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
const CACHE_PREFIX = 'npm_stats_cache_';

// Rate limiting configuration
const MAX_CONCURRENT_REQUESTS = 6; // Limit concurrent API requests
const REQUEST_DELAY_MS = 100; // Delay between request batches (ms)

// Request queue management
let activeRequests = 0;
const requestQueue: Array<() => Promise<void>> = [];

/**
 * Throttle API requests to avoid overwhelming the NPM API
 */
async function throttledFetch<T>(
  fn: () => Promise<T>
): Promise<T> {
  return new Promise((resolve, reject) => {
    const executeRequest = async () => {
      activeRequests++;
      try {
        const result = await fn();
        resolve(result);
      } catch (error) {
        reject(error);
      } finally {
        activeRequests--;
        // Process next request in queue
        if (requestQueue.length > 0) {
          const nextRequest = requestQueue.shift();
          if (nextRequest) {
            // Add small delay between batches
            setTimeout(() => {
              nextRequest();
            }, REQUEST_DELAY_MS);
          }
        }
      }
    };

    if (activeRequests < MAX_CONCURRENT_REQUESTS) {
      executeRequest();
    } else {
      requestQueue.push(executeRequest);
    }
  });
}

interface CachedStats {
  data: {
    currentWeekDownloads: number | null;
    previousWeekDownloads: number | null;
    currentMonthDownloads: number | null;
    previousMonthDownloads: number | null;
    currentYearDownloads: number | null;
    previousYearDownloads: number | null;
  };
  timestamp: number;
}

/**
 * Get the date range for the last 7 days
 */
function getLast7DaysRange(): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 6); // Last 7 days including today

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

/**
 * Get the date range for the previous 7 days
 */
function getPrevious7DaysRange(): { start: string; end: string } {
  const end = new Date();
  end.setDate(end.getDate() - 7); // 7 days ago
  const start = new Date(end);
  start.setDate(start.getDate() - 6); // 6 days before that (7 days total)

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

/**
 * Get the date range for the last 30 days
 */
function getLast30DaysRange(): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 29); // Last 30 days including today

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

/**
 * Get the date range for the previous 30 days
 */
function getPrevious30DaysRange(): { start: string; end: string } {
  const end = new Date();
  end.setDate(end.getDate() - 30); // 30 days ago
  const start = new Date(end);
  start.setDate(start.getDate() - 29); // 29 days before that (30 days total)

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

/**
 * Get the date range for the last 365 days
 */
function getLast365DaysRange(): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 364); // Last 365 days including today

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

/**
 * Get the date range for the previous 365 days
 */
function getPrevious365DaysRange(): { start: string; end: string } {
  const end = new Date();
  end.setDate(end.getDate() - 365); // 365 days ago
  const start = new Date(end);
  start.setDate(start.getDate() - 364); // 364 days before that (365 days total)

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

/**
 * Get cache key for a package name
 */
function getCacheKey(packageName: string): string {
  return `${CACHE_PREFIX}${packageName}`;
}

/**
 * Get cached stats with validity information
 * Returns the cached stats object if it exists, null otherwise
 */
function getCachedStatsWithValidity(packageName: string): CachedStats | null {
  try {
    const cacheKey = getCacheKey(packageName);
    const cached = localStorage.getItem(cacheKey);
    
    if (!cached) {
      return null;
    }

    const cachedStats: CachedStats = JSON.parse(cached);
    return cachedStats;
  } catch (error) {
    // If there's an error reading from localStorage, return null
    console.warn('Error reading cache:', error);
    return null;
  }
}

/**
 * Store stats in cache with timestamp
 * @param packageName - Package name
 * @param data - Stats data to cache
 * @param timestamp - Optional timestamp. If not provided, uses current time
 */
function setCachedStats(
  packageName: string,
  data: CachedStats['data'],
  timestamp?: number
): void {
  try {
    const cacheKey = getCacheKey(packageName);
    const cachedStats: CachedStats = {
      data,
      timestamp: timestamp ?? Date.now(),
    };
    localStorage.setItem(cacheKey, JSON.stringify(cachedStats));
  } catch (error) {
    // Handle quota exceeded error specifically
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.warn('LocalStorage quota exceeded. Clearing old cache entries...');
      // Try to clear some old cache entries
      try {
        const keys = Object.keys(localStorage);
        const cacheKeys = keys.filter((key) => key.startsWith(CACHE_PREFIX));
        // Remove oldest 50% of cache entries
        const entries = cacheKeys.map((key) => {
          try {
            const cached = localStorage.getItem(key);
            if (cached) {
              const parsed: CachedStats = JSON.parse(cached);
              return { key, timestamp: parsed.timestamp };
            }
          } catch {
            return null;
          }
          return null;
        }).filter((entry): entry is { key: string; timestamp: number } => entry !== null);
        
        entries.sort((a, b) => a.timestamp - b.timestamp);
        const toRemove = Math.ceil(entries.length / 2);
        entries.slice(0, toRemove).forEach((entry) => {
          localStorage.removeItem(entry.key);
        });
        
        // Retry setting the cache
        try {
          localStorage.setItem(cacheKey, JSON.stringify(cachedStats));
        } catch (retryError) {
          console.warn('Failed to cache after cleanup:', retryError);
        }
      } catch (cleanupError) {
        console.warn('Failed to cleanup cache:', cleanupError);
      }
    } else {
      // If there's another error writing to localStorage, just log it
      // Don't fail the request if caching fails
      console.warn('Error writing to cache:', error);
    }
  }
}

/**
 * Fetch download statistics for a package in a given date range
 * Uses throttling to limit concurrent requests
 */
async function fetchDownloads(
  packageName: string,
  start: string,
  end: string
): Promise<DownloadData> {
  return throttledFetch(async () => {
    const url = `${API_BASE}/${start}:${end}/${packageName}`;
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Package "${packageName}" not found`);
      }
      if (response.status === 429) {
        throw new Error(`Rate limit exceeded. Please try again later.`);
      }
      throw new Error(`Failed to fetch stats for "${packageName}" (${response.status})`);
    }

    return response.json();
  });
}

/**
 * Clear cache for a specific package
 */
export function clearPackageCache(packageName: string): void {
  try {
    const cacheKey = getCacheKey(packageName);
    localStorage.removeItem(cacheKey);
  } catch (error) {
    console.warn('Error clearing cache:', error);
  }
}

/**
 * Clear cache for all packages
 */
export function clearAllCache(): void {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.warn('Error clearing all cache:', error);
  }
}

/**
 * Safely fetch downloads for a date range, returning null on error
 */
async function fetchDownloadsSafely(
  packageName: string,
  start: string,
  end: string
): Promise<number | null> {
  try {
    const data = await fetchDownloads(packageName, start, end);
    return data.downloads.reduce((sum, day) => sum + day.downloads, 0);
  } catch (error) {
    console.warn(
      `Failed to fetch downloads for ${packageName} from ${start} to ${end}:`,
      error
    );
    return null;
  }
}

/**
 * Fetch download statistics for a package for the last 7 days and previous 7 days
 * Uses localStorage cache with 6-hour expiration
 * @param forceRefresh - If true, bypasses cache and fetches fresh data
 */
export async function getPackageStats(
  packageName: string,
  forceRefresh: boolean = false
): Promise<{
  currentWeekDownloads: number | null;
  previousWeekDownloads: number | null;
  currentMonthDownloads: number | null;
  previousMonthDownloads: number | null;
  currentYearDownloads: number | null;
  previousYearDownloads: number | null;
}> {
  // Clear cache if force refresh is requested
  if (forceRefresh) {
    clearPackageCache(packageName);
  }

  // Get date ranges
  const [
    currentWeekRange,
    previousWeekRange,
    currentMonthRange,
    previousMonthRange,
    currentYearRange,
    previousYearRange,
  ] = [
    getLast7DaysRange(),
    getPrevious7DaysRange(),
    getLast30DaysRange(),
    getPrevious30DaysRange(),
    getLast365DaysRange(),
    getPrevious365DaysRange(),
  ];

  // Check cache first
  const cachedStatsObj = getCachedStatsWithValidity(packageName);
  const now = Date.now();
  const isCacheValid = cachedStatsObj && (now - cachedStatsObj.timestamp) < CACHE_EXPIRY_MS;
  const cachedStats = cachedStatsObj?.data;
  
  // Check if there are any missing entries (null values) in cached data
  const hasMissingEntries = cachedStats && [
    cachedStats.currentWeekDownloads,
    cachedStats.previousWeekDownloads,
    cachedStats.currentMonthDownloads,
    cachedStats.previousMonthDownloads,
    cachedStats.currentYearDownloads,
    cachedStats.previousYearDownloads,
  ].some((value) => value === null);
  
  // If cache exists, is valid, has no missing entries, and force refresh is not requested,
  // return it as-is
  if (isCacheValid && !hasMissingEntries && !forceRefresh && cachedStatsObj) {
    return cachedStatsObj.data;
  }

  // If we have cached data (valid or expired) with missing entries, retry only missing entries
  // This ensures we fill in gaps even if cache is still valid
  if (cachedStats && !forceRefresh) {
    // Keep non-null values, retry only null values
    const fetchPromises = [
      cachedStats.currentWeekDownloads !== null
        ? Promise.resolve(cachedStats.currentWeekDownloads)
        : fetchDownloadsSafely(
            packageName,
            currentWeekRange.start,
            currentWeekRange.end
          ),
      cachedStats.previousWeekDownloads !== null
        ? Promise.resolve(cachedStats.previousWeekDownloads)
        : fetchDownloadsSafely(
            packageName,
            previousWeekRange.start,
            previousWeekRange.end
          ),
      cachedStats.currentMonthDownloads !== null
        ? Promise.resolve(cachedStats.currentMonthDownloads)
        : fetchDownloadsSafely(
            packageName,
            currentMonthRange.start,
            currentMonthRange.end
          ),
      cachedStats.previousMonthDownloads !== null
        ? Promise.resolve(cachedStats.previousMonthDownloads)
        : fetchDownloadsSafely(
            packageName,
            previousMonthRange.start,
            previousMonthRange.end
          ),
      cachedStats.currentYearDownloads !== null
        ? Promise.resolve(cachedStats.currentYearDownloads)
        : fetchDownloadsSafely(
            packageName,
            currentYearRange.start,
            currentYearRange.end
          ),
      cachedStats.previousYearDownloads !== null
        ? Promise.resolve(cachedStats.previousYearDownloads)
        : fetchDownloadsSafely(
            packageName,
            previousYearRange.start,
            previousYearRange.end
          ),
    ];

    const [
      currentWeekDownloads,
      previousWeekDownloads,
      currentMonthDownloads,
      previousMonthDownloads,
      currentYearDownloads,
      previousYearDownloads,
    ] = await Promise.all(fetchPromises);

    const stats = {
      currentWeekDownloads,
      previousWeekDownloads,
      currentMonthDownloads,
      previousMonthDownloads,
      currentYearDownloads,
      previousYearDownloads,
    };

    // Update cache with merged results (retry results for previously failed fetches)
    // Preserve the original timestamp since we're only filling missing data
    const hasAnySuccess = [
      currentWeekDownloads,
      previousWeekDownloads,
      currentMonthDownloads,
      previousMonthDownloads,
      currentYearDownloads,
      previousYearDownloads,
    ].some((value) => value !== null);

    if (hasAnySuccess && cachedStatsObj) {
      // Preserve original timestamp when only fetching missing data
      setCachedStats(packageName, stats, cachedStatsObj.timestamp);
    }

    return stats;
  }

  // Cache miss or stale, fetch fresh data for all stats
  const [
    currentWeekDownloads,
    previousWeekDownloads,
    currentMonthDownloads,
    previousMonthDownloads,
    currentYearDownloads,
    previousYearDownloads,
  ] = await Promise.all([
    fetchDownloadsSafely(
      packageName,
      currentWeekRange.start,
      currentWeekRange.end
    ),
    fetchDownloadsSafely(
      packageName,
      previousWeekRange.start,
      previousWeekRange.end
    ),
    fetchDownloadsSafely(
      packageName,
      currentMonthRange.start,
      currentMonthRange.end
    ),
    fetchDownloadsSafely(
      packageName,
      previousMonthRange.start,
      previousMonthRange.end
    ),
    fetchDownloadsSafely(
      packageName,
      currentYearRange.start,
      currentYearRange.end
    ),
    fetchDownloadsSafely(
      packageName,
      previousYearRange.start,
      previousYearRange.end
    ),
  ]);

  const stats = {
    currentWeekDownloads,
    previousWeekDownloads,
    currentMonthDownloads,
    previousMonthDownloads,
    currentYearDownloads,
    previousYearDownloads,
  };

  // Only cache if at least one stat succeeded (not all null)
  // This allows retrying failed fetches on browser reload
  const hasAnySuccess = [
    currentWeekDownloads,
    previousWeekDownloads,
    currentMonthDownloads,
    previousMonthDownloads,
    currentYearDownloads,
    previousYearDownloads,
  ].some((value) => value !== null);

  if (hasAnySuccess) {
    // Cache the fresh data (even if some stats are null)
    setCachedStats(packageName, stats);
  }
  // If all stats are null (all fetches failed), don't cache
  // This allows retrying on browser reload

  return stats;
}
