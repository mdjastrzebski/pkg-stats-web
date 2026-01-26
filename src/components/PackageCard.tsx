import type { PackageStats } from '../types';
import { formatNumber, formatChangePercent } from '../utils/stats';

interface PackageCardProps {
  stats: PackageStats;
  onRemove: () => void;
}

export function PackageCard({ stats, onRemove }: PackageCardProps) {
  const {
    packageName,
    currentWeekDownloads,
    changePercent,
    monthChangePercent,
    yearChangePercent,
    isLoading,
    error,
  } = stats;

  const getChangeColor = (percent: number | null): string => {
    if (percent === null) {
      return 'text-gray-600 dark:text-gray-400';
    }
    return percent >= 0
      ? 'text-green-600 dark:text-green-400'
      : 'text-red-600 dark:text-red-400';
  };

  const changeColor = getChangeColor(changePercent);
  const monthChangeColor = getChangeColor(monthChangePercent);
  const yearChangeColor = getChangeColor(yearChangePercent);

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-red-200 dark:border-red-800">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            {packageName}
          </h3>
          <button
            onClick={onRemove}
            className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            aria-label={`Remove ${packageName}`}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            {packageName}
          </h3>
          <button
            onClick={onRemove}
            className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            aria-label={`Remove ${packageName}`}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
          {packageName}
        </h3>
        <button
          onClick={onRemove}
          className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          aria-label={`Remove ${packageName}`}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <div className="space-y-2">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Downloads (last 7 days)
          </p>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white">
            {formatNumber(currentWeekDownloads)}
          </p>
        </div>

        <div className="pt-2 border-t border-gray-200 dark:border-gray-700 space-y-3">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Week over week change
            </p>
            <p className={`text-lg font-semibold ${changeColor}`}>
              {formatChangePercent(changePercent)}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Month over month change
            </p>
            <p className={`text-lg font-semibold ${monthChangeColor}`}>
              {formatChangePercent(monthChangePercent)}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Year over year change
            </p>
            <p className={`text-lg font-semibold ${yearChangeColor}`}>
              {formatChangePercent(yearChangePercent)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
