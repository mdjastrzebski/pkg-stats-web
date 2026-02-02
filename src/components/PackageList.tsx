import * as React from 'react';
import { PackageCard } from './PackageCard';
import { ErrorBoundary } from './ErrorBoundary';
import { getCachedPromise, invalidatePromise } from '../services/promise-cache';
import { PackageCardError } from './PackageCardError';
import { PackageCardSkeleton } from './PackageCardSkeleton';
import type { PackageStats } from '../types';

interface PackageListProps {
  packages: string[];
  onRemove: (packageName: string) => void;
}

export function PackageList({ packages, onRemove }: PackageListProps) {
  const [statsMap, setStatsMap] = React.useState<Record<string, PackageStats>>(
    {},
  );

  const sortedPackages = React.useMemo(() => {
    return sortPackages(packages, statsMap);
  }, [packages, statsMap]);

  const handleStatsLoaded = (stats: PackageStats) => {
    setStatsMap((prev) => ({ ...prev, [stats.name]: stats }));
  };

  if (sortedPackages.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-500 text-xl tracking-wider">
          No packages added yet. Add your first package above!
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {sortedPackages.map((packageName) => (
        <PackageCardWrapper
          key={packageName}
          packageName={packageName}
          onStatsLoaded={handleStatsLoaded}
          onRemove={() => onRemove(packageName)}
        />
      ))}
    </div>
  );
}

function PackageCardWrapper({
  packageName,
  onStatsLoaded,
  onRemove,
}: {
  packageName: string;
  onStatsLoaded: (stats: PackageStats) => void;
  onRemove: () => void;
}) {
  const [retryKey, setRetryKey] = React.useState(0);

  // Get promise from module-level cache
  const statsPromise = getCachedPromise(packageName, onStatsLoaded);

  return (
    <ErrorBoundary
      key={`${packageName}-${retryKey}`}
      fallback={(error, reset) => (
        <PackageCardError
          packageName={packageName}
          error={error}
          onRemove={onRemove}
          onRetry={() => {
            invalidatePromise(packageName);
            setRetryKey((prev) => prev + 1);
            reset();
          }}
        />
      )}
    >
      <React.Suspense
        fallback={<PackageCardSkeleton packageName={packageName} />}
      >
        <PackageCard
          packageName={packageName}
          statsPromise={statsPromise}
          onRemove={onRemove}
        />
      </React.Suspense>
    </ErrorBoundary>
  );
}

function sortPackages(
  packages: string[],
  statsMap: Record<string, PackageStats>,
) {
  return [...packages].sort((a, b) => {
    const aStats = statsMap[a];
    const bStats = statsMap[b];
    return (bStats?.weeklyCurrent ?? 0) - (aStats?.weeklyCurrent ?? 0);
  });
}
