import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocalStorage } from './hooks/use-local-storage';
import {
  getPackageStats,
  clearAllCache,
  getCacheTimestamp,
  CACHE_EXPIRY_MS,
} from './services/npm-api';
import type { DeprecatedPackageStats } from './types';
import { calculateChangePercent, calculateChange } from './utils/stats';
import { PackageInput } from './components/PackageInput';
import { PackageList } from './components/PackageList';

function App() {
  const { packages, addPackage, removePackage } = useLocalStorage();
  const [stats, setStats] = useState<DeprecatedPackageStats[]>([]);
  const statsRef = useRef<DeprecatedPackageStats[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    statsRef.current = stats;
  }, [stats]);

  const fetchAllStats = useCallback(
    async (forceRefresh: boolean = false) => {
      const statsPromises = packages.map(async (packageName) => {
        // Check if cache exists and determine staleness
        const cacheTimestamp = getCacheTimestamp(packageName);
        const isStale = cacheTimestamp
          ? Date.now() - cacheTimestamp > CACHE_EXPIRY_MS
          : false;

        if (!forceRefresh) {
          const existing = statsRef.current.find(
            (s) => s.packageName === packageName,
          );
          // If data exists and not loading and no error, return it with staleness flag
          if (existing && !existing.isLoading && !existing.error) {
            if (isStale) {
              // Mark as stale and trigger background refresh
              return { ...existing, isStale: true };
            }
            return existing;
          }
        }

        // Get existing data to preserve it during loading
        const existing = statsRef.current.find(
          (s) => s.packageName === packageName,
        );
        const hasExistingData = existing?.currentWeekDownloads !== null;

        // If we have existing data, mark as loading but keep the data
        if (hasExistingData && existing) {
          setStats((prev) => {
            const filtered = prev.filter((s) => s.packageName !== packageName);
            return [
              ...filtered,
              {
                ...existing,
                isLoading: true,
                isStale: true,
              },
            ];
          });
        } else {
          // No existing data, show skeleton
          setStats((prev) => {
            const filtered = prev.filter((s) => s.packageName !== packageName);
            return [
              ...filtered,
              {
                packageName,
                currentWeekDownloads: null,
                previousWeekDownloads: null,
                change: null,
                changePercent: null,
                currentMonthDownloads: null,
                previousMonthDownloads: null,
                monthChange: null,
                monthChangePercent: null,
                currentYearDownloads: null,
                previousYearDownloads: null,
                yearChange: null,
                yearChangePercent: null,
                isLoading: true,
                isStale: false,
                error: null,
              },
            ];
          });
        }

        try {
          const data = await getPackageStats(packageName, forceRefresh);

          // If data is null, it means the package doesn't exist or API failed
          if (data === null) {
            return {
              packageName,
              currentWeekDownloads: null,
              previousWeekDownloads: null,
              change: null,
              changePercent: null,
              currentMonthDownloads: null,
              previousMonthDownloads: null,
              monthChange: null,
              monthChangePercent: null,
              currentYearDownloads: null,
              previousYearDownloads: null,
              yearChange: null,
              yearChangePercent: null,
              isLoading: false,
              isStale: false,
              error: 'No data available for this package',
            };
          }

          const changePercent = calculateChangePercent(
            data.weeklyCurrent,
            data.weeklyPrevious,
          );
          const monthChangePercent = calculateChangePercent(
            data.monthlyCurrent,
            data.monthlyPrevious,
          );
          const yearChangePercent = calculateChangePercent(
            data.yearlyCurrent,
            data.yearlyPrevious,
          );

          return {
            packageName,
            currentWeekDownloads: data.weeklyCurrent,
            previousWeekDownloads: data.weeklyPrevious,
            change: calculateChange(data.weeklyCurrent, data.weeklyPrevious),
            changePercent,
            currentMonthDownloads: data.monthlyCurrent,
            previousMonthDownloads: data.monthlyPrevious,
            monthChange: calculateChange(
              data.monthlyCurrent,
              data.monthlyPrevious,
            ),
            monthChangePercent,
            currentYearDownloads: data.yearlyCurrent,
            previousYearDownloads: data.yearlyPrevious,
            yearChange: calculateChange(
              data.yearlyCurrent,
              data.yearlyPrevious,
            ),
            yearChangePercent,
            isLoading: false,
            isStale: false,
            error: null,
          };
        } catch (error) {
          // On error, preserve existing data if available
          if (hasExistingData && existing) {
            return {
              ...existing,
              isLoading: false,
              error:
                error instanceof Error
                  ? error.message
                  : 'Failed to fetch stats',
            };
          }
          return {
            packageName,
            currentWeekDownloads: null,
            previousWeekDownloads: null,
            change: null,
            changePercent: null,
            currentMonthDownloads: null,
            previousMonthDownloads: null,
            monthChange: null,
            monthChangePercent: null,
            currentYearDownloads: null,
            previousYearDownloads: null,
            yearChange: null,
            yearChangePercent: null,
            isLoading: false,
            isStale: false,
            error:
              error instanceof Error ? error.message : 'Failed to fetch stats',
          };
        }
      });

      const results = await Promise.all(statsPromises);
      const sortedResults = results.sort((a, b) => {
        const aVal = a.currentWeekDownloads ?? 0;
        const bVal = b.currentWeekDownloads ?? 0;
        return bVal - aVal;
      });
      setStats(sortedResults);
    },
    [packages],
  );

  useEffect(() => {
    if (packages.length > 0) {
      fetchAllStats();
    }
  }, [packages, fetchAllStats]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    clearAllCache();
    await fetchAllStats(true);
    setIsRefreshing(false);
  };

  const handleAddPackage = (packageName: string) => {
    addPackage(packageName);
    setStats((prev) => {
      if (prev.some((s) => s.packageName === packageName.toLowerCase())) {
        return prev;
      }
      return [
        ...prev,
        {
          packageName: packageName.toLowerCase(),
          currentWeekDownloads: null,
          previousWeekDownloads: null,
          change: null,
          changePercent: null,
          currentMonthDownloads: null,
          previousMonthDownloads: null,
          monthChange: null,
          monthChangePercent: null,
          currentYearDownloads: null,
          previousYearDownloads: null,
          yearChange: null,
          yearChangePercent: null,
          isLoading: true,
          isStale: false,
          error: null,
        },
      ];
    });
  };

  const handleRemovePackage = (packageName: string) => {
    removePackage(packageName);
    setStats((prev) => prev.filter((s) => s.packageName !== packageName));
  };

  const isLoadingAny = stats.some((s) => s.isLoading);

  return (
    <div className="min-h-screen bg-slate-950 py-8 px-4 sm:px-6 w-full">
      <div className="max-w-7xl mx-auto w-full">
        <header className="relative text-center mb-12">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing || packages.length === 0}
            className="absolute top-0 right-0 p-3 border-2 border-slate-700/50 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:border-violet-500/50 hover:text-violet-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold rounded-lg"
            aria-label="Refresh stats"
            aria-busy={isRefreshing}
            title="Refresh stats"
          >
            <svg
              className={`w-6 h-6 ${isRefreshing ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={3}
            >
              <path
                strokeLinecap="square"
                strokeLinejoin="miter"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
          <h1 className="text-6xl font-bold text-slate-100 mb-4 tracking-tight">
            NPM Package Stats
          </h1>
          <p className="text-slate-400 text-lg">
            Track download statistics for your favorite{' '}
            <span className="text-violet-400">NPM packages</span>
          </p>
        </header>

        <div className="mb-8">
          <PackageInput onAdd={handleAddPackage} isLoading={isLoadingAny} />
        </div>

        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {isLoadingAny && 'Loading package statistics'}
          {!isLoadingAny &&
            stats.length > 0 &&
            `${stats.length} package${stats.length === 1 ? '' : 's'} loaded`}
        </div>

        <PackageList packages={stats} onRemove={handleRemovePackage} />
      </div>
    </div>
  );
}

export default App;
