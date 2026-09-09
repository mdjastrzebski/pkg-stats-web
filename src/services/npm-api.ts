import type { DownloadData, PackageStats } from '../types';
import { FetchError } from '../types';
import { RequestScheduler } from '../scheduler';

const API_BASE =
  import.meta.env.VITE_NPM_API_BASE_URL ||
  'https://api.npmjs.org/downloads/range';
const SEARCH_API_BASE =
  import.meta.env.VITE_NPM_SEARCH_API_BASE_URL ||
  'https://registry.npmjs.org/-/v1/search';

const MAX_CONCURRENT_REQUESTS = 6;

const scheduler = new RequestScheduler({
  maxConcurrent: MAX_CONCURRENT_REQUESTS,
});

const DAYS_PER_WEEK = 7;
const DAYS_PER_MONTH = 30;
const DAYS_PER_YEAR = 365;
const DAYS_OFFSET_WEEK = DAYS_PER_WEEK - 1;
const DAYS_OFFSET_MONTH = DAYS_PER_MONTH - 1;
const DAYS_OFFSET_YEAR = DAYS_PER_YEAR - 1;

// Number of most-recent days inspected for gaps. A day with zero downloads (or
// no data at all) inside this window usually means the NPM API has not
// finalized that day yet.
const RECENT_RELIABILITY_WINDOW_DAYS = 7;

// Days immediately before the recent window used to confirm the package
// normally has a steady, near-daily download history. Four whole weeks keeps
// the sample free of weekday skew.
const BASELINE_HISTORY_DAYS = 28;

// Fraction of baseline days that must report downloads for the recent window to
// be judged against an "established" history. Below this, zero-download days in
// the recent window are treated as normal for a new or low-traffic package and
// `missingDataDays` stays 0.
const BASELINE_MIN_ACTIVE_RATIO = 0.75;

export interface DateRange {
  start: string;
  end: string;
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

  function countActiveDays(start: Date, end: Date): number {
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];

    return sorted.filter(
      (d) => d.day >= startStr && d.day <= endStr && d.downloads > 0,
    ).length;
  }

  const recentWindowStart = new Date(yesterday);
  recentWindowStart.setDate(
    recentWindowStart.getDate() - (RECENT_RELIABILITY_WINDOW_DAYS - 1),
  );
  const baselineEnd = new Date(recentWindowStart);
  baselineEnd.setDate(baselineEnd.getDate() - 1);
  const baselineStart = new Date(baselineEnd);
  baselineStart.setDate(baselineStart.getDate() - (BASELINE_HISTORY_DAYS - 1));

  const hasEstablishedHistory =
    countActiveDays(baselineStart, baselineEnd) >=
    BASELINE_HISTORY_DAYS * BASELINE_MIN_ACTIVE_RATIO;

  const missingDataDays = hasEstablishedHistory
    ? RECENT_RELIABILITY_WINDOW_DAYS -
      countActiveDays(recentWindowStart, yesterday)
    : 0;

  return {
    name: packageName,
    weeklyCurrent: sumRange(currentWeekStart, yesterday),
    weeklyPrevious: sumRange(previousWeekStart, previousWeekEnd),
    monthlyCurrent: sumRange(currentMonthStart, yesterday),
    monthlyPrevious: sumRange(previousMonthStart, previousMonthEnd),
    yearlyCurrent: sumRange(currentYearStart, yesterday),
    yearlyPrevious: sumRange(previousYearStart, previousYearEnd),
    missingDataDays,
  };
}

async function fetchDownloads(
  packageName: string,
  start: string,
  end: string,
): Promise<DownloadData> {
  return scheduler.schedule(async () => {
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
  });
}

async function fetchDownloadsSafely(
  packageName: string,
  start: string,
  end: string,
): Promise<DownloadData | null> {
  try {
    return await fetchDownloads(packageName, start, end);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.warn(
      `Failed to fetch downloads for "${packageName}" (${start} to ${end}): ${errorMessage}`,
    );
    return null;
  }
}

export async function getPackageStats(
  packageName: string,
): Promise<PackageStats | null> {
  const range = getFullDataRange();
  const dailyData = await fetchDownloadsSafely(
    packageName,
    range.start,
    range.end,
  );

  if (!dailyData?.downloads || dailyData.downloads.length === 0) {
    return null;
  }

  return calculateStatsFromDailyData(packageName, dailyData.downloads);
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
}
