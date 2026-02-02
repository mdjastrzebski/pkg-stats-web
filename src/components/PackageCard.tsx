import * as React from 'react';
import type { PackageStats } from '../types';
import {
  formatNumber,
  formatChangePercent,
  calculatePackageNameFontSize,
  computeStats,
} from '../utils/stats';

interface PackageCardProps {
  packageName: string;
  onRemove: () => void;
  statsPromise: Promise<PackageStats>;
}

export function PackageCard({
  packageName,
  onRemove,
  statsPromise,
}: PackageCardProps) {
  const stats = React.use(statsPromise);
  const computed = computeStats(stats);

  const getChangeColor = (percent: number | null): string => {
    if (percent === null) {
      return 'text-slate-400';
    }
    return percent >= 0 ? 'text-green-400' : 'text-rose-400';
  };

  const changeColor = getChangeColor(computed.weekChangePercent);
  const monthChangeColor = getChangeColor(computed.monthChangePercent);
  const yearChangeColor = getChangeColor(computed.yearChangePercent);

  const npmUrl = `https://www.npmjs.com/package/${packageName}?activeTab=versions`;

  return (
    <div className="bg-slate-800 border border-slate-700/50 p-6 rounded-xl shadow-lg hover:shadow-xl hover:border-violet-500/50 hover:bg-slate-800/90 transition-all cursor-pointer relative">
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
      <div className="flex justify-between items-start mb-4 gap-3 pr-8">
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

      <div className="space-y-3">
        <div>
          <p className="text-xs text-slate-400 tracking-wider mb-1">
            Downloads (last 7 days)
          </p>
          <p className="text-5xl font-bold text-violet-400 font-mono">
            {formatNumber(computed.currentWeekDownloads)}
          </p>
        </div>

        <div className="pt-3 border-t border-slate-700/50">
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <div>
              <p className="text-xs text-slate-400 tracking-wider mb-1">Week</p>
              <p className={`text-lg font-bold font-mono ${changeColor}`}>
                {formatChangePercent(computed.weekChangePercent)}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-400 tracking-wider mb-1">
                Month
              </p>
              <p className={`text-lg font-bold font-mono ${monthChangeColor}`}>
                {formatChangePercent(computed.monthChangePercent)}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-400 tracking-wider mb-1">Year</p>
              <p className={`text-lg font-bold font-mono ${yearChangeColor}`}>
                {formatChangePercent(computed.yearChangePercent)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
