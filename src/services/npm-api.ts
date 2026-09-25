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

// The NPM range API returns at most 18 months per request and silently drops
// older days, so the full range is fetched in chunks that stay safely under
// that limit (the shortest 18-month span is ~546 days). Two chunks cover the
// full two-year range.
const MAX_DAYS_PER_REQUEST = 540;

// Maximum number of most-recent days the stats windows can slide back when the
// NPM API has not finalized those days yet (they report zero downloads or no
// data at all). One extra week is fetched on top of two full years so the
// shifted previous-year window still has complete data.
const MAX_DATA_DELAY_DAYS = 7;

// Days immediately before the delay window used to confirm the package
// normally has a steady, near-daily download history. Four whole weeks keeps
// the sample free of weekday skew.
const BASELINE_HISTORY_DAYS = 28;

// Fraction of baseline days that must report downloads for trailing
// zero-download days to be treated as a publishing delay, and interior ones as
// gaps to estimate. Below this, recent zero-download days are treated as normal
// for a new or low-traffic package and `dataDelayDays` stays 0.
const BASELINE_MIN_ACTIVE_RATIO = 0.75;

// How many weeks before and after a missing day to search for the same weekday
// with reported downloads when estimating its value. Using the same weekday
// keeps the weekday/weekend pattern intact.
const GAP_FILL_MAX_WEEKS = 4;

// Minimum estimate for a zero-download day to count as a data gap. Downloads
// are roughly Poisson, so a real zero at this rate is ~e^-10 (0.005%) likely;
// below it, the zero is kept as plausibly real.
const GAP_FILL_MIN_ESTIMATE = 10;

export interface DateRange {
  start: string;
  end: string;
}

// NPM reports downloads per UTC day, so all dates here are UTC midnights and
// day arithmetic uses UTC to stay independent of the user's timezone.
function toDayString(date: Date): string {
  return date.toISOString().split('T')[0];
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function getYesterdayUtc(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1),
  );
}

function getDataRanges(): DateRange[] {
  const end = getYesterdayUtc();
  const start = addDays(end, -(DAYS_PER_YEAR * 2 + MAX_DATA_DELAY_DAYS - 1));

  const ranges: DateRange[] = [];
  for (
    let chunkStart = start;
    chunkStart <= end;
    chunkStart = addDays(chunkStart, MAX_DAYS_PER_REQUEST)
  ) {
    const chunkEnd = addDays(chunkStart, MAX_DAYS_PER_REQUEST - 1);
    ranges.push({
      start: toDayString(chunkStart),
      end: toDayString(chunkEnd < end ? chunkEnd : end),
    });
  }
  return ranges;
}

function calculateStatsFromDailyData(
  packageName: string,
  dailyData: Array<{ downloads: number; day: string }>,
): PackageStats {
  const downloadsByDay = new Map<string, number>();
  for (const d of dailyData) {
    downloadsByDay.set(d.day, d.downloads);
  }

  const yesterday = getYesterdayUtc();

  function countActiveDays(start: Date, end: Date): number {
    const startStr = toDayString(start);
    const endStr = toDayString(end);

    return dailyData.filter(
      (d) => d.day >= startStr && d.day <= endStr && d.downloads > 0,
    ).length;
  }

  const baselineEnd = addDays(yesterday, -MAX_DATA_DELAY_DAYS);
  const baselineStart = addDays(baselineEnd, -(BASELINE_HISTORY_DAYS - 1));
  const hasEstablishedHistory =
    countActiveDays(baselineStart, baselineEnd) >=
    BASELINE_HISTORY_DAYS * BASELINE_MIN_ACTIVE_RATIO;

  // Count trailing days (starting from yesterday) with no downloads reported.
  let dataDelayDays = 0;
  if (hasEstablishedHistory) {
    while (
      dataDelayDays < MAX_DATA_DELAY_DAYS &&
      !downloadsByDay.get(toDayString(addDays(yesterday, -dataDelayDays)))
    ) {
      dataDelayDays++;
    }
  }

  // Slide every window back so comparisons end on the last day with data.
  const currentEnd = addDays(yesterday, -dataDelayDays);
  const currentEndStr = toDayString(currentEnd);

  // For established packages, a zero-download day inside the range is an NPM
  // data gap rather than a real zero. Estimate it from the nearest same weekday
  // with data before and after it (up to currentEnd), but only when that
  // estimate makes a real zero implausible. Days before the package's first
  // recorded download stay zero.
  // Chunks are not guaranteed to arrive in date order, so take the minimum.
  const firstActiveDay = dailyData
    .filter((d) => d.downloads > 0)
    .reduce<string | undefined>(
      (min, d) => (min === undefined || d.day < min ? d.day : min),
      undefined,
    );
  const estimatedDays = new Set<string>();

  function findSameWeekdayDownloads(
    date: Date,
    direction: 1 | -1,
  ): number | undefined {
    for (let week = 1; week <= GAP_FILL_MAX_WEEKS; week++) {
      const day = toDayString(addDays(date, direction * week * DAYS_PER_WEEK));
      if (day > currentEndStr) return undefined;
      // Only real data counts; chaining estimates would stretch one value
      // across a gap of any length.
      if (estimatedDays.has(day)) continue;
      const downloads = downloadsByDay.get(day);
      if (downloads) return downloads;
    }
    return undefined;
  }

  if (hasEstablishedHistory && firstActiveDay) {
    for (
      let date = new Date(`${firstActiveDay}T00:00:00Z`);
      toDayString(date) <= currentEndStr;
      date = addDays(date, 1)
    ) {
      const day = toDayString(date);
      if (downloadsByDay.get(day)) continue;

      const neighbors = [
        findSameWeekdayDownloads(date, -1),
        findSameWeekdayDownloads(date, 1),
      ].filter((value) => value !== undefined);
      if (neighbors.length === 0) continue;

      const estimate = Math.round(
        neighbors.reduce((sum, value) => sum + value, 0) / neighbors.length,
      );
      // The baseline only vouches for recent weeks; older sparse days may be
      // real zeros.
      if (estimate < GAP_FILL_MIN_ESTIMATE) continue;

      downloadsByDay.set(day, estimate);
      estimatedDays.add(day);
    }
  }

  function sumRange(start: Date, end: Date): number {
    const startStr = toDayString(start);
    const endStr = toDayString(end);

    let sum = 0;
    for (const [day, downloads] of downloadsByDay) {
      if (day >= startStr && day <= endStr) sum += downloads;
    }
    return sum;
  }

  function countEstimatedDays(start: Date, end: Date): number {
    const startStr = toDayString(start);
    const endStr = toDayString(end);

    let count = 0;
    for (const day of estimatedDays) {
      if (day >= startStr && day <= endStr) count++;
    }
    return count;
  }

  const currentWeekStart = addDays(currentEnd, -DAYS_OFFSET_WEEK);
  const previousWeekEnd = addDays(currentWeekStart, -1);
  const previousWeekStart = addDays(previousWeekEnd, -DAYS_OFFSET_WEEK);

  const currentMonthStart = addDays(currentEnd, -DAYS_OFFSET_MONTH);
  const previousMonthEnd = addDays(currentMonthStart, -1);
  const previousMonthStart = addDays(previousMonthEnd, -DAYS_OFFSET_MONTH);

  const currentYearStart = addDays(currentEnd, -DAYS_OFFSET_YEAR);
  const previousYearEnd = addDays(currentYearStart, -1);
  const previousYearStart = addDays(previousYearEnd, -DAYS_OFFSET_YEAR);

  return {
    name: packageName,
    weeklyCurrent: sumRange(currentWeekStart, currentEnd),
    weeklyPrevious: sumRange(previousWeekStart, previousWeekEnd),
    monthlyCurrent: sumRange(currentMonthStart, currentEnd),
    monthlyPrevious: sumRange(previousMonthStart, previousMonthEnd),
    yearlyCurrent: sumRange(currentYearStart, currentEnd),
    yearlyPrevious: sumRange(previousYearStart, previousYearEnd),
    dataDelayDays,
    estimatedDays: countEstimatedDays(currentMonthStart, currentEnd),
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
  const chunks = await Promise.all(
    getDataRanges().map((range) =>
      fetchDownloadsSafely(packageName, range.start, range.end),
    ),
  );

  if (chunks.some((chunk) => !chunk?.downloads)) {
    return null;
  }

  const dailyData = chunks.flatMap((chunk) => chunk?.downloads ?? []);
  if (dailyData.length === 0) {
    return null;
  }

  return calculateStatsFromDailyData(packageName, dailyData);
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
