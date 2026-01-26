import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { getPackageStats, clearAllCache } from './services/npmApi';
import type { PackageStats } from './types';
import { calculateChangePercent } from './utils/stats';
import { PackageInput } from './components/PackageInput';
import { PackageList } from './components/PackageList';

function App() {
  const { packages, addPackage, removePackage } = useLocalStorage();
  const [stats, setStats] = useState<PackageStats[]>([]);
  const statsRef = useRef<PackageStats[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Update ref whenever stats change
  useEffect(() => {
    statsRef.current = stats;
  }, [stats]);

  // Fetch stats for all packages
  const fetchAllStats = useCallback(async (forceRefresh: boolean = false) => {
    const statsPromises = packages.map(async (packageName) => {
      // If force refresh, skip existing stats check
      if (!forceRefresh) {
        // Check if stats already exist and are valid
        const existing = statsRef.current.find((s) => s.packageName === packageName);
        if (existing && !existing.isLoading && !existing.error) {
          return existing;
        }
      }

      // Set loading state
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
            error: null,
          },
        ];
      });

      try {
        const data = await getPackageStats(packageName, forceRefresh);
        const changePercent = calculateChangePercent(
          data.currentWeekDownloads,
          data.previousWeekDownloads
        );
        const monthChangePercent = calculateChangePercent(
          data.currentMonthDownloads,
          data.previousMonthDownloads
        );
        const yearChangePercent = calculateChangePercent(
          data.currentYearDownloads,
          data.previousYearDownloads
        );

        // Calculate changes, returning null if either value is null
        const calculateChange = (
          current: number | null,
          previous: number | null
        ): number | null => {
          if (current === null || previous === null) {
            return null;
          }
          return current - previous;
        };

        return {
          packageName,
          currentWeekDownloads: data.currentWeekDownloads,
          previousWeekDownloads: data.previousWeekDownloads,
          change: calculateChange(
            data.currentWeekDownloads,
            data.previousWeekDownloads
          ),
          changePercent,
          currentMonthDownloads: data.currentMonthDownloads,
          previousMonthDownloads: data.previousMonthDownloads,
          monthChange: calculateChange(
            data.currentMonthDownloads,
            data.previousMonthDownloads
          ),
          monthChangePercent,
          currentYearDownloads: data.currentYearDownloads,
          previousYearDownloads: data.previousYearDownloads,
          yearChange: calculateChange(
            data.currentYearDownloads,
            data.previousYearDownloads
          ),
          yearChangePercent,
          isLoading: false,
          error: null,
        };
      } catch (error) {
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
          error: error instanceof Error ? error.message : 'Failed to fetch stats',
        };
      }
    });

    const results = await Promise.all(statsPromises);
    // Sort by currentWeekDownloads descending (highest to lowest)
    // Treat null as 0 for sorting purposes
    const sortedResults = results.sort((a, b) => {
      const aVal = a.currentWeekDownloads ?? 0;
      const bVal = b.currentWeekDownloads ?? 0;
      return bVal - aVal;
    });
    setStats(sortedResults);
  }, [packages]);

  useEffect(() => {
    if (packages.length > 0) {
      fetchAllStats();
    } else {
      setStats([]);
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
  };

  const handleRemovePackage = (packageName: string) => {
    removePackage(packageName);
    setStats((prev) => prev.filter((s) => s.packageName !== packageName));
  };

  const isLoadingAny = stats.some((s) => s.isLoading);

  return (
    <div className="min-h-screen bg-slate-950 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <header className="relative text-center mb-12">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing || packages.length === 0}
            className="absolute top-0 right-0 p-3 border-4 border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:border-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold rounded-lg"
            aria-label="Refresh stats"
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
            Track download statistics for your favorite NPM packages
          </p>
        </header>

        <div className="mb-8">
          <PackageInput onAdd={handleAddPackage} isLoading={isLoadingAny} />
        </div>

        <PackageList packages={stats} onRemove={handleRemovePackage} />
      </div>
    </div>
  );
}

export default App;
