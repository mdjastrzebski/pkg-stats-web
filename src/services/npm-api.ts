import type { DownloadData } from "../types";
import { FetchError } from "../types";
import { TaskScheduler } from "../scheduler";

const API_BASE =
  import.meta.env.VITE_NPM_API_BASE_URL ||
  "https://api.npmjs.org/downloads/range";
const SEARCH_API_BASE =
  import.meta.env.VITE_NPM_SEARCH_API_BASE_URL ||
  "https://registry.npmjs.org/-/v1/search";

const CACHE_EXPIRY_HOURS = 6;
const CACHE_EXPIRY_MS = CACHE_EXPIRY_HOURS * 60 * 60 * 1000;
const CACHE_PREFIX = "npm_stats_cache_";
const CACHE_CLEANUP_PERCENTAGE = 0.5;

const MAX_CONCURRENT_REQUESTS = 6;

const scheduler = new TaskScheduler({
  maxConcurrent: MAX_CONCURRENT_REQUESTS,
});

const DAYS_PER_WEEK = 7;
const DAYS_PER_MONTH = 30;
const DAYS_PER_YEAR = 365;
const DAYS_OFFSET_WEEK = DAYS_PER_WEEK - 1;
const DAYS_OFFSET_MONTH = DAYS_PER_MONTH - 1;
const DAYS_OFFSET_YEAR = DAYS_PER_YEAR - 1;

export interface DateRange {
  start: string;
  end: string;
}

async function throttledFetch<T>(
  fn: () => Promise<T>,
  priority: number = 0,
): Promise<T> {
  return scheduler.schedule(fn, { priority });
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

function getLast7DaysRange(): DateRange {
  const end = new Date();
  end.setDate(end.getDate() - 1);
  const start = new Date(end);
  start.setDate(start.getDate() - DAYS_OFFSET_WEEK);

  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
}

function getPrevious7DaysRange(): DateRange {
  const end = new Date();
  end.setDate(end.getDate() - 1 - DAYS_PER_WEEK);
  const start = new Date(end);
  start.setDate(start.getDate() - DAYS_OFFSET_WEEK);

  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
}

function getLast30DaysRange(): DateRange {
  const end = new Date();
  end.setDate(end.getDate() - 1);
  const start = new Date(end);
  start.setDate(start.getDate() - DAYS_OFFSET_MONTH);

  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
}

function getPrevious30DaysRange(): DateRange {
  const end = new Date();
  end.setDate(end.getDate() - 1 - DAYS_PER_MONTH);
  const start = new Date(end);
  start.setDate(start.getDate() - DAYS_OFFSET_MONTH);

  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
}

function getLast365DaysRange(): DateRange {
  const end = new Date();
  end.setDate(end.getDate() - 1);
  const start = new Date(end);
  start.setDate(start.getDate() - DAYS_OFFSET_YEAR);

  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
}

function getPrevious365DaysRange(): DateRange {
  const end = new Date();
  end.setDate(end.getDate() - 1 - DAYS_PER_YEAR);
  const start = new Date(end);
  start.setDate(start.getDate() - DAYS_OFFSET_YEAR);

  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
}

function getCacheKey(packageName: string): string {
  return `${CACHE_PREFIX}${packageName}`;
}

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
    console.warn("Error reading cache:", error);
    return null;
  }
}

function setCachedStats(
  packageName: string,
  data: CachedStats["data"],
  timestamp?: number,
): void {
  const cacheKey = getCacheKey(packageName);
  const cachedStats: CachedStats = {
    data,
    timestamp: timestamp ?? Date.now(),
  };

  try {
    localStorage.setItem(cacheKey, JSON.stringify(cachedStats));
  } catch (error) {
    if (error instanceof DOMException && error.name === "QuotaExceededError") {
      console.warn(
        "LocalStorage quota exceeded. Clearing old cache entries...",
      );
      try {
        const keys = Object.keys(localStorage);
        const cacheKeys = keys.filter((key) => key.startsWith(CACHE_PREFIX));
        const entries = cacheKeys
          .map((key) => {
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
          })
          .filter((entry) => entry !== null);

        entries.sort((a, b) => a.timestamp - b.timestamp);
        const toRemove = Math.ceil(entries.length * CACHE_CLEANUP_PERCENTAGE);
        entries.slice(0, toRemove).forEach((entry) => {
          localStorage.removeItem(entry.key);
        });

        try {
          localStorage.setItem(cacheKey, JSON.stringify(cachedStats));
        } catch (retryError) {
          console.warn("Failed to cache after cleanup:", retryError);
        }
      } catch (cleanupError) {
        console.warn("Failed to cleanup cache:", cleanupError);
      }
    } else {
      console.warn("Error writing to cache:", error);
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
    const url = `${API_BASE}/${start}:${end}/${packageName}`;
    const response = await fetch(url);

    if (!response.ok) {
      const status = response.status;
      const statusText = response.statusText;

      if (status === 404) {
        throw new FetchError(
          `Package "${packageName}" not found. Please check the package name and try again.`,
          status,
          response,
        );
      }
      if (status === 429) {
        throw new FetchError(
          `Rate limit exceeded (HTTP ${status}). The NPM API has rate limits. Please wait a moment and try again.`,
          status,
          response,
        );
      }
      if (status >= 500) {
        throw new FetchError(
          `NPM API server error (HTTP ${status} ${statusText}). The service may be temporarily unavailable. Please try again later.`,
          status,
          response,
        );
      }
      throw new FetchError(
        `Failed to fetch download statistics for "${packageName}" (HTTP ${status} ${statusText}). Please try again later.`,
        status,
        response,
      );
    }

    return response.json();
  }, priority);
}

export function clearPackageCache(packageName: string): void {
  try {
    const cacheKey = getCacheKey(packageName);
    localStorage.removeItem(cacheKey);
  } catch (error) {
    console.warn("Error clearing cache:", error);
  }
}

export function clearAllCache(): void {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.warn("Error clearing all cache:", error);
  }
}

async function fetchDownloadsSafely(
  packageName: string,
  start: string,
  end: string,
  priority: number = 0,
): Promise<number | null> {
  try {
    const data = await fetchDownloads(packageName, start, end, priority);
    return data.downloads.reduce((sum, day) => sum + day.downloads, 0);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.warn(
      `Failed to fetch downloads for "${packageName}" (${start} to ${end}): ${errorMessage}`,
    );
    return null;
  }
}

const PRIORITY_CURRENT = 40;
const PRIORITY_PREV_WEEK = 30;
const PRIORITY_PREV_MONTH = 20;
const PRIORITY_PREV_YEAR = 10;

export async function getPackageStats(
  packageName: string,
  forceRefresh: boolean = false,
): Promise<{
  currentWeekDownloads: number | null;
  previousWeekDownloads: number | null;
  currentMonthDownloads: number | null;
  previousMonthDownloads: number | null;
  currentYearDownloads: number | null;
  previousYearDownloads: number | null;
}> {
  if (forceRefresh) {
    clearPackageCache(packageName);
  }

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

  const cachedStatsObj = getCachedStatsWithValidity(packageName);
  const now = Date.now();
  const isCacheValid =
    cachedStatsObj && now - cachedStatsObj.timestamp < CACHE_EXPIRY_MS;
  const cachedStats = cachedStatsObj?.data;

  const hasMissingEntries =
    cachedStats &&
    [
      cachedStats.currentWeekDownloads,
      cachedStats.previousWeekDownloads,
      cachedStats.currentMonthDownloads,
      cachedStats.previousMonthDownloads,
      cachedStats.currentYearDownloads,
      cachedStats.previousYearDownloads,
    ].some((value) => value === null);

  if (isCacheValid && !hasMissingEntries && !forceRefresh && cachedStatsObj) {
    return cachedStatsObj.data;
  }

  if (cachedStats && !forceRefresh) {
    const fetchPromises = [
      cachedStats.currentWeekDownloads !== null
        ? Promise.resolve(cachedStats.currentWeekDownloads)
        : fetchDownloadsSafely(
            packageName,
            currentWeekRange.start,
            currentWeekRange.end,
            PRIORITY_CURRENT,
          ),
      cachedStats.previousWeekDownloads !== null
        ? Promise.resolve(cachedStats.previousWeekDownloads)
        : fetchDownloadsSafely(
            packageName,
            previousWeekRange.start,
            previousWeekRange.end,
            PRIORITY_PREV_WEEK,
          ),
      cachedStats.currentMonthDownloads !== null
        ? Promise.resolve(cachedStats.currentMonthDownloads)
        : fetchDownloadsSafely(
            packageName,
            currentMonthRange.start,
            currentMonthRange.end,
            PRIORITY_CURRENT,
          ),
      cachedStats.previousMonthDownloads !== null
        ? Promise.resolve(cachedStats.previousMonthDownloads)
        : fetchDownloadsSafely(
            packageName,
            previousMonthRange.start,
            previousMonthRange.end,
            PRIORITY_PREV_MONTH,
          ),
      cachedStats.currentYearDownloads !== null
        ? Promise.resolve(cachedStats.currentYearDownloads)
        : fetchDownloadsSafely(
            packageName,
            currentYearRange.start,
            currentYearRange.end,
            PRIORITY_CURRENT,
          ),
      cachedStats.previousYearDownloads !== null
        ? Promise.resolve(cachedStats.previousYearDownloads)
        : fetchDownloadsSafely(
            packageName,
            previousYearRange.start,
            previousYearRange.end,
            PRIORITY_PREV_YEAR,
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

    const hasAnySuccess = [
      currentWeekDownloads,
      previousWeekDownloads,
      currentMonthDownloads,
      previousMonthDownloads,
      currentYearDownloads,
      previousYearDownloads,
    ].some((value) => value !== null);

    if (hasAnySuccess && cachedStatsObj) {
      setCachedStats(packageName, stats, cachedStatsObj.timestamp);
    }

    return stats;
  }

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
      currentWeekRange.end,
      PRIORITY_CURRENT,
    ),
    fetchDownloadsSafely(
      packageName,
      previousWeekRange.start,
      previousWeekRange.end,
      PRIORITY_PREV_WEEK,
    ),
    fetchDownloadsSafely(
      packageName,
      currentMonthRange.start,
      currentMonthRange.end,
      PRIORITY_CURRENT,
    ),
    fetchDownloadsSafely(
      packageName,
      previousMonthRange.start,
      previousMonthRange.end,
      PRIORITY_PREV_MONTH,
    ),
    fetchDownloadsSafely(
      packageName,
      currentYearRange.start,
      currentYearRange.end,
      PRIORITY_CURRENT,
    ),
    fetchDownloadsSafely(
      packageName,
      previousYearRange.start,
      previousYearRange.end,
      PRIORITY_PREV_YEAR,
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

  const hasAnySuccess = [
    currentWeekDownloads,
    previousWeekDownloads,
    currentMonthDownloads,
    previousMonthDownloads,
    currentYearDownloads,
    previousYearDownloads,
  ].some((value) => value !== null);

  if (hasAnySuccess) {
    setCachedStats(packageName, stats);
  }
  // Skip caching when all stats are null so a full retry happens on reload.

  return stats;
}

export interface PackageSearchResult {
  name: string;
  description?: string;
}

export interface PackageSearchResponse {
  objects: Array<{
    package: {
      name: string;
      description?: string;
    };
  }>;
}

export async function searchPackages(
  query: string,
  limit: number = 10,
): Promise<PackageSearchResult[]> {
  if (!query.trim()) {
    return [];
  }

  return throttledFetch(async () => {
    const url = `${SEARCH_API_BASE}?text=${encodeURIComponent(
      query,
    )}&size=${limit}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.warn(`Failed to search packages: ${response.status}`);
      return [];
    }

    const data: PackageSearchResponse = await response.json();
    return data.objects.map((obj) => ({
      name: obj.package.name,
      description: obj.package.description,
    }));
  });
}
