import { useState, Suspense } from 'react';
import { PackageCard } from './PackageCard';
import { ErrorBoundary } from './ErrorBoundary';
import { clearPackageCache } from '../services/npm-api';
import {
  getCachedPromise,
  invalidatePromise,
} from '../services/promise-cache';
import { calculatePackageNameFontSize } from '../utils/stats';

interface PackageListProps {
  packages: string[];
  onRemove: (packageName: string) => void;
}

function PackageCardSkeleton({ packageName }: { packageName: string }) {
  const npmUrl = `https://www.npmjs.com/package/${packageName}?activeTab=versions`;

  return (
    <div className="bg-slate-800 border border-slate-700/50 p-6 rounded-xl shadow-lg relative">
      <button
        className="absolute top-2 right-2 text-slate-500 p-1 flex-shrink-0 cursor-not-allowed"
        aria-label={`Remove ${packageName}`}
        disabled
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={3}
        >
          <path
            strokeLinecap="square"
            strokeLinejoin="miter"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
      <div className="flex justify-between items-start mb-2 gap-3 pr-8">
        <a
          href={npmUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-slate-100 tracking-tight flex-1 min-w-0 pr-2 hover:text-violet-400 transition-colors whitespace-nowrap"
          style={{
            fontSize: calculatePackageNameFontSize(packageName),
            lineHeight: '1.2',
          }}
          title={packageName}
        >
          {packageName}
        </a>
      </div>
      <div className="animate-pulse">
        <div className="h-6 bg-slate-700/50 w-3/4 mb-2 rounded-lg"></div>
        <div className="h-6 bg-slate-700/50 w-1/2 rounded-lg"></div>
      </div>
    </div>
  );
}

function PackageCardError({
  packageName,
  error,
  onRemove,
  onRetry,
}: {
  packageName: string;
  error: Error;
  onRemove: () => void;
  onRetry: () => void;
}) {
  const npmUrl = `https://www.npmjs.com/package/${packageName}?activeTab=versions`;

  return (
    <div className="bg-slate-800 border border-slate-700/50 p-6 rounded-xl shadow-lg transition-all relative">
      <button
        onClick={onRemove}
        className="absolute top-2 right-2 text-slate-500 hover:text-slate-300 transition-colors p-1 flex-shrink-0"
        aria-label={`Remove ${packageName}`}
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={3}
        >
          <path
            strokeLinecap="square"
            strokeLinejoin="miter"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
      <div className="flex justify-between items-start mb-2 gap-3 pr-8">
        <a
          href={npmUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-slate-100 tracking-tight flex-1 min-w-0 pr-2 hover:text-violet-400 transition-colors whitespace-nowrap"
          style={{
            fontSize: calculatePackageNameFontSize(packageName),
            lineHeight: '1.2',
          }}
          title={packageName}
        >
          {packageName}
        </a>
      </div>
      <p className="text-red-400 mb-3">{error.message}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors"
      >
        Retry
      </button>
    </div>
  );
}

function PackageCardWrapper({
  packageName,
  onRemove,
}: {
  packageName: string;
  onRemove: () => void;
}) {
  const [retryKey, setRetryKey] = useState(0);

  // Get promise from module-level cache
  const statsPromise = getCachedPromise(packageName);

  return (
    <ErrorBoundary
      key={`${packageName}-${retryKey}`}
      fallback={(error, reset) => (
        <PackageCardError
          packageName={packageName}
          error={error}
          onRemove={onRemove}
          onRetry={() => {
            clearPackageCache(packageName);
            invalidatePromise(packageName);
            setRetryKey((prev) => prev + 1);
            reset();
          }}
        />
      )}
    >
      <Suspense fallback={<PackageCardSkeleton packageName={packageName} />}>
        <PackageCard
          packageName={packageName}
          statsPromise={statsPromise}
          onRemove={onRemove}
        />
      </Suspense>
    </ErrorBoundary>
  );
}

export function PackageList({ packages, onRemove }: PackageListProps) {
  if (packages.length === 0) {
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
      {packages.map((packageName) => (
        <PackageCardWrapper
          key={packageName}
          packageName={packageName}
          onRemove={() => onRemove(packageName)}
        />
      ))}
    </div>
  );
}
