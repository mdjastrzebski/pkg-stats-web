import type { DownloadData } from '../types';

const API_BASE = 'https://api.npmjs.org/downloads/range';
const CACHE_EXPIRY_MS = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
const CACHE_PREFIX = 'npm_stats_cache_';

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
 * Get cached stats for a package if they exist and are not stale
 */
function getCachedStats(packageName: string): CachedStats['data'] | null {
  try {
    const cacheKey = getCacheKey(packageName);
    const cached = localStorage.getItem(cacheKey);
    
    if (!cached) {
      return null;
    }

    const cachedStats: CachedStats = JSON.parse(cached);
    const now = Date.now();
    const age = now - cachedStats.timestamp;

    // Check if cache is still valid (less than 6 hours old)
    if (age < CACHE_EXPIRY_MS) {
      return cachedStats.data;
    }

    // Cache is stale, remove it
    localStorage.removeItem(cacheKey);
    return null;
  } catch (error) {
    // If there's an error reading from localStorage, return null
    console.warn('Error reading cache:', error);
    return null;
  }
}

/**
 * Store stats in cache with current timestamp
 */
function setCachedStats(
  packageName: string,
  data: CachedStats['data']
): void {
  try {
    const cacheKey = getCacheKey(packageName);
    const cachedStats: CachedStats = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(cacheKey, JSON.stringify(cachedStats));
  } catch (error) {
    // If there's an error writing to localStorage, just log it
    // Don't fail the request if caching fails
    console.warn('Error writing to cache:', error);
  }
}

/**
 * Fetch download statistics for a package in a given date range
 */
async function fetchDownloads(
  packageName: string,
  start: string,
  end: string
): Promise<DownloadData> {
  const url = `${API_BASE}/${start}:${end}/${packageName}`;
  const response = await fetch(url);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Package "${packageName}" not found`);
    }
    throw new Error(`Failed to fetch stats for "${packageName}"`);
  }

  return response.json();
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

  // Check cache first
  const cachedStats = getCachedStats(packageName);
  if (cachedStats) {
    return cachedStats;
  }

  // Cache miss or stale, fetch fresh data
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

  // Fetch all stats independently, allowing individual failures
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

  // Cache the fresh data (even if some stats are null)
  setCachedStats(packageName, stats);

  return stats;
}
