import type { DownloadData, PackageStats } from '../types';
import { FetchError } from '../types';
import { TaskScheduler } from '../scheduler';
import {
  CACHE_EXPIRY_MS,
  getCachedStats,
  setCachedStats,
  getCacheTimestamp,
  clearPackageCache,
  clearAllCache,
} from './cache';

const API_BASE =
  import.meta.env.VITE_NPM_API_BASE_URL ||
  'https://api.npmjs.org/downloads/range';
const SEARCH_API_BASE =
  import.meta.env.VITE_NPM_SEARCH_API_BASE_URL ||
  'https://registry.npmjs.org/-/v1/search';

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

function getFullDataRange(): DateRange {
  const end = new Date();
  end.setDate(end.getDate() - 1);
  const start = new Date(end);
  start.setDate(start.getDate() - (DAYS_PER_YEAR * 2 - 1));

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

function calculateStatsFromDailyData(
  packageName: string,
  dailyData: Array<{ downloads: number; day: string }>,
): PackageStats {
  const sorted = [...dailyData].sort((a, b) => a.day.localeCompare(b.day));
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  const currentWeekStart = new Date(yesterday);
  currentWeekStart.setDate(currentWeekStart.getDate() - DAYS_OFFSET_WEEK);

  const previousWeekEnd = new Date(currentWeekStart);
  previousWeekEnd.setDate(previousWeekEnd.getDate() - 1);
  const previousWeekStart = new Date(previousWeekEnd);
  previousWeekStart.setDate(previousWeekStart.getDate() - DAYS_OFFSET_WEEK);

  const currentMonthStart = new Date(yesterday);
  currentMonthStart.setDate(currentMonthStart.getDate() - DAYS_OFFSET_MONTH);

  const previousMonthEnd = new Date(currentMonthStart);
  previousMonthEnd.setDate(previousMonthEnd.getDate() - 1);
  const previousMonthStart = new Date(previousMonthEnd);
  previousMonthStart.setDate(previousMonthStart.getDate() - DAYS_OFFSET_MONTH);

  const currentYearStart = new Date(yesterday);
  currentYearStart.setDate(currentYearStart.getDate() - DAYS_OFFSET_YEAR);

  const previousYearEnd = new Date(currentYearStart);
  previousYearEnd.setDate(previousYearEnd.getDate() - 1);
  const previousYearStart = new Date(previousYearEnd);
  previousYearStart.setDate(previousYearStart.getDate() - DAYS_OFFSET_YEAR);

  function sumRange(start: Date, end: Date): number {
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];

    return sorted
      .filter((d) => d.day >= startStr && d.day <= endStr)
      .reduce((sum, d) => sum + d.downloads, 0);
  }

  return {
    name: packageName,
    weeklyCurrent: sumRange(currentWeekStart, yesterday),
    weeklyPrevious: sumRange(previousWeekStart, previousWeekEnd),
    monthlyCurrent: sumRange(currentMonthStart, yesterday),
    monthlyPrevious: sumRange(previousMonthStart, previousMonthEnd),
    yearlyCurrent: sumRange(currentYearStart, yesterday),
    yearlyPrevious: sumRange(previousYearStart, previousYearEnd),
  };
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

async function fetchDownloadsSafely(
  packageName: string,
  start: string,
  end: string,
  priority: number = 0,
): Promise<DownloadData | null> {
  try {
    return await fetchDownloads(packageName, start, end, priority);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.warn(
      `Failed to fetch downloads for "${packageName}" (${start} to ${end}): ${errorMessage}`,
    );
    return null;
  }
}

const PRIORITY_CURRENT = 40;

export async function getPackageStats(
  packageName: string,
  forceRefresh: boolean = false,
): Promise<PackageStats | null> {
  if (forceRefresh) {
    clearPackageCache(packageName);
  }

  const cached = getCachedStats(packageName);
  const now = Date.now();
  const isCacheValid = cached && now - cached.timestamp < CACHE_EXPIRY_MS;

  if (isCacheValid && cached) {
    return cached.data;
  }

  const range = getFullDataRange();
  const dailyData = await fetchDownloadsSafely(
    packageName,
    range.start,
    range.end,
    PRIORITY_CURRENT,
  );

  // If API call failed or returned no data, return null
  if (!dailyData?.downloads || dailyData.downloads.length === 0) {
    return null;
  }

  const stats = calculateStatsFromDailyData(packageName, dailyData.downloads);

  // Cache the stats (they always have valid data at this point)
  setCachedStats(packageName, stats);

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

export { CACHE_EXPIRY_MS, getCacheTimestamp, clearPackageCache, clearAllCache };
