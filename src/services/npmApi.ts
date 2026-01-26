import type { DownloadData } from '../types';

const API_BASE = 'https://api.npmjs.org/downloads/range';
const CACHE_EXPIRY_MS = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
const CACHE_PREFIX = 'npm_stats_cache_';

interface CachedStats {
  data: {
    currentWeekDownloads: number;
    previousWeekDownloads: number;
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
 * Fetch download statistics for a package for the last 7 days and previous 7 days
 * Uses localStorage cache with 6-hour expiration
 */
export async function getPackageStats(packageName: string): Promise<{
  currentWeekDownloads: number;
  previousWeekDownloads: number;
}> {
  // Check cache first
  const cachedStats = getCachedStats(packageName);
  if (cachedStats) {
    return cachedStats;
  }

  // Cache miss or stale, fetch fresh data
  const [currentRange, previousRange] = [
    getLast7DaysRange(),
    getPrevious7DaysRange(),
  ];

  const [currentData, previousData] = await Promise.all([
    fetchDownloads(packageName, currentRange.start, currentRange.end),
    fetchDownloads(packageName, previousRange.start, previousRange.end),
  ]);

  const currentWeekDownloads = currentData.downloads.reduce(
    (sum, day) => sum + day.downloads,
    0
  );

  const previousWeekDownloads = previousData.downloads.reduce(
    (sum, day) => sum + day.downloads,
    0
  );

  const stats = {
    currentWeekDownloads,
    previousWeekDownloads,
  };

  // Cache the fresh data
  setCachedStats(packageName, stats);

  return stats;
}
