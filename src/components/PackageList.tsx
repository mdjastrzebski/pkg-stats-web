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
      <div className="text-center py-24">
        <p className="font-display text-2xl italic mb-3 text-text-tertiary">
          No packages yet
        </p>
        <p className="text-sm text-text-tertiary opacity-60">
          Search for an npm package above to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {sortedPackages.map((packageName, index) => (
        <PackageCardWrapper
          key={packageName}
          packageName={packageName}
          index={index}
          onStatsLoaded={handleStatsLoaded}
          onRemove={() => onRemove(packageName)}
        />
      ))}
    </div>
  );
}

function PackageCardWrapper({
  packageName,
  index,
  onStatsLoaded,
  onRemove,
}: {
  packageName: string;
  index: number;
  onStatsLoaded: (stats: PackageStats) => void;
  onRemove: () => void;
}) {
  const [retryKey, setRetryKey] = React.useState(0);

  const statsPromise = getCachedPromise(packageName, onStatsLoaded);

  return (
    <ErrorBoundary
      key={`${packageName}-${retryKey}`}
      fallback={(error, reset) => (
        <PackageCardError
          packageName={packageName}
          error={error}
          index={index}
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
        fallback={
          <PackageCardSkeleton
            packageName={packageName}
            index={index}
            onRemove={onRemove}
          />
        }
      >
        <PackageCard
          packageName={packageName}
          statsPromise={statsPromise}
          index={index}
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
