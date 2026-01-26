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
      return 'text-slate-400';
    }
    return percent >= 0
      ? 'text-emerald-300'
      : 'text-rose-400';
  };

  const changeColor = getChangeColor(changePercent);
  const monthChangeColor = getChangeColor(monthChangePercent);
  const yearChangeColor = getChangeColor(yearChangePercent);

  if (error) {
    return (
      <div className="bg-slate-900 border-2 border-rose-500 p-6 rounded-lg">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-2xl font-bold text-slate-100 tracking-tight">
            {packageName}
          </h3>
          <button
            onClick={onRemove}
            className="text-slate-400 hover:text-slate-200 transition-colors p-1"
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
        </div>
        <p className="text-rose-400">{error}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-slate-900 border-2 border-slate-700 p-6 rounded-lg">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-2xl font-bold text-slate-100 tracking-tight">
            {packageName}
          </h3>
          <button
            onClick={onRemove}
            className="text-slate-400 hover:text-slate-200 transition-colors p-1"
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
        </div>
        <div className="animate-pulse">
          <div className="h-6 bg-slate-700 w-3/4 mb-2 rounded"></div>
          <div className="h-6 bg-slate-700 w-1/2 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border-2 border-slate-700 p-6 hover:border-emerald-300 transition-all rounded-lg">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-2xl font-bold text-slate-100 tracking-tight">
          {packageName}
        </h3>
        <button
          onClick={onRemove}
          className="text-slate-400 hover:text-slate-200 transition-colors p-1"
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
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-xs text-slate-400 tracking-wider mb-1">
            Downloads (last 7 days)
          </p>
          <p className="text-4xl font-bold text-emerald-200 font-mono">
            {formatNumber(currentWeekDownloads)}
          </p>
        </div>

        <div className="pt-3 border-t-2 border-slate-700">
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <div>
              <p className="text-xs text-slate-400 tracking-wider mb-1">
                Week
              </p>
              <p className={`text-lg font-bold font-mono ${changeColor}`}>
                {formatChangePercent(changePercent)}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-400 tracking-wider mb-1">
                Month
              </p>
              <p className={`text-lg font-bold font-mono ${monthChangeColor}`}>
                {formatChangePercent(monthChangePercent)}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-400 tracking-wider mb-1">
                Year
              </p>
              <p className={`text-lg font-bold font-mono ${yearChangeColor}`}>
                {formatChangePercent(yearChangePercent)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
