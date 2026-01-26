import { useState, useEffect, useRef } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { getPackageStats } from './services/npmApi';
import type { PackageStats } from './types';
import { calculateChangePercent } from './utils/stats';
import { PackageInput } from './components/PackageInput';
import { PackageList } from './components/PackageList';

function App() {
  const { packages, addPackage, removePackage } = useLocalStorage();
  const [stats, setStats] = useState<PackageStats[]>([]);
  const statsRef = useRef<PackageStats[]>([]);

  // Update ref whenever stats change
  useEffect(() => {
    statsRef.current = stats;
  }, [stats]);

  // Fetch stats for all packages
  useEffect(() => {
    const fetchAllStats = async () => {
      const statsPromises = packages.map(async (packageName) => {
        // Check if stats already exist and are valid
        const existing = statsRef.current.find((s) => s.packageName === packageName);
        if (existing && !existing.isLoading && !existing.error) {
          return existing;
        }

        // Set loading state
        setStats((prev) => {
          const filtered = prev.filter((s) => s.packageName !== packageName);
          return [
            ...filtered,
            {
              packageName,
              currentWeekDownloads: 0,
              previousWeekDownloads: 0,
              change: 0,
              changePercent: 0,
              isLoading: true,
              error: null,
            },
          ];
        });

        try {
          const data = await getPackageStats(packageName);
          const changePercent = calculateChangePercent(
            data.currentWeekDownloads,
            data.previousWeekDownloads
          );

          return {
            packageName,
            currentWeekDownloads: data.currentWeekDownloads,
            previousWeekDownloads: data.previousWeekDownloads,
            change: data.currentWeekDownloads - data.previousWeekDownloads,
            changePercent,
            isLoading: false,
            error: null,
          };
        } catch (error) {
          return {
            packageName,
            currentWeekDownloads: 0,
            previousWeekDownloads: 0,
            change: 0,
            changePercent: 0,
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to fetch stats',
          };
        }
      });

      const results = await Promise.all(statsPromises);
      // Sort by currentWeekDownloads descending (highest to lowest)
      const sortedResults = results.sort(
        (a, b) => b.currentWeekDownloads - a.currentWeekDownloads
      );
      setStats(sortedResults);
    };

    if (packages.length > 0) {
      fetchAllStats();
    } else {
      setStats([]);
    }
  }, [packages]);

  const handleAddPackage = (packageName: string) => {
    addPackage(packageName);
  };

  const handleRemovePackage = (packageName: string) => {
    removePackage(packageName);
    setStats((prev) => prev.filter((s) => s.packageName !== packageName));
  };

  const isLoadingAny = stats.some((s) => s.isLoading);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            NPM Package Stats
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
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
