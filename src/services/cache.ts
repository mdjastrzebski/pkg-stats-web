import type { PackageDownloadStats } from '../types';

const CACHE_EXPIRY_HOURS = 6;
export const CACHE_EXPIRY_MS = CACHE_EXPIRY_HOURS * 60 * 60 * 1000;
const CACHE_PREFIX = 'npm_stats_cache_';
const CACHE_CLEANUP_PERCENTAGE = 0.5;

export interface CachedStats {
  data: PackageDownloadStats;
  timestamp: number;
}

function getCacheKey(packageName: string): string {
  return `${CACHE_PREFIX}${packageName}`;
}

function isValidPackageDownloadStats(
  data: unknown,
): data is PackageDownloadStats {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const d = data as Record<string, unknown>;

  // Check basic structure
  if (typeof d.name !== 'string') {
    return false;
  }

  const fields = [
    d.weeklyCurrent,
    d.weeklyPrevious,
    d.monthlyCurrent,
    d.monthlyPrevious,
    d.yearlyCurrent,
    d.yearlyPrevious,
  ];

  // All fields must be numbers (we don't cache null data)
  return fields.every((f) => typeof f === 'number');
}

function getCachedStats(packageName: string): CachedStats | null {
  try {
    const cacheKey = getCacheKey(packageName);
    const cached = localStorage.getItem(cacheKey);

    if (!cached) {
      return null;
    }

    const cachedStats: CachedStats = JSON.parse(cached);

    // Validate data format
    if (!isValidPackageDownloadStats(cachedStats.data)) {
      // Invalid format, remove from cache
      localStorage.removeItem(cacheKey);
      return null;
    }

    return cachedStats;
  } catch (error) {
    console.warn('Error reading cache:', error);
    return null;
  }
}

export function getCacheTimestamp(packageName: string): number | null {
  const cached = getCachedStats(packageName);
  return cached?.timestamp ?? null;
}

function setCachedStats(
  packageName: string,
  data: CachedStats['data'],
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
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.warn(
        'LocalStorage quota exceeded. Clearing old cache entries...',
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
          console.warn('Failed to cache after cleanup:', retryError);
        }
      } catch (cleanupError) {
        console.warn('Failed to cleanup cache:', cleanupError);
      }
    } else {
      console.warn('Error writing to cache:', error);
    }
  }
}

export function clearPackageCache(packageName: string): void {
  try {
    const cacheKey = getCacheKey(packageName);
    localStorage.removeItem(cacheKey);
  } catch (error) {
    console.warn('Error clearing cache:', error);
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
    console.warn('Error clearing all cache:', error);
  }
}

export { getCachedStats, setCachedStats };
