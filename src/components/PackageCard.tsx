import * as React from 'react';
import type { PackageStats } from '../types';
import {
  formatNumber,
  formatChangePercent,
  calculatePackageNameFontSize,
  computeStats,
} from '../utils/stats';
import { CloseIcon } from './icons/CloseIcon';

interface PackageCardProps {
  packageName: string;
  onRemove: () => void;
  statsPromise: Promise<PackageStats>;
  index: number;
}

export function PackageCard({
  packageName,
  onRemove,
  statsPromise,
  index,
}: PackageCardProps) {
  const stats = React.use(statsPromise);
  const computed = computeStats(stats);

  const getChangeClass = (percent: number | null): string => {
    if (percent === null) return 'text-text-tertiary';
    return percent >= 0 ? 'text-positive' : 'text-negative';
  };

  const getArrow = (percent: number | null): string => {
    if (percent === null) return '';
    return percent >= 0 ? '\u2191' : '\u2193';
  };

  const isNegative =
    computed.weekChangePercent !== null && computed.weekChangePercent < 0;
  const isUnreliable = computed.missingDataDays > 0;
  const npmUrl = `https://www.npmjs.com/package/${packageName}?activeTab=versions`;

  return (
    <div
      className={`card-glow ${isNegative ? 'card-glow-negative' : ''} rounded-2xl px-6 pt-5 pb-6 transition-all duration-400 animate-fade-slide-in relative group bg-bg-card border border-border-subtle hover:bg-bg-card-hover hover:border-border-medium`}
      style={{ animationDelay: `${index * 0.06}s` }}
    >
      <button
        onClick={onRemove}
        className="absolute top-5 right-5 p-1 cursor-pointer rounded-md transition-all duration-200 text-text-tertiary hover:text-red-400 hover:drop-shadow-[0_0_4px_rgba(248,113,113,0.4)]"
        aria-label={`Remove ${packageName}`}
      >
        <CloseIcon className="w-5 h-5" />
      </button>

      <div className="mb-5">
        <a
          href={npmUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold tracking-tight block pr-8 transition-colors duration-200 overflow-hidden text-ellipsis text-text-primary hover:text-accent leading-[1.2]"
          style={{ fontSize: calculatePackageNameFontSize(packageName) }}
          title={packageName}
        >
          {packageName}
          {isUnreliable && (
            <span
              className="ml-1.5 text-amber-400 align-middle"
              role="img"
              aria-label="Download data may be unreliable"
              title={`${computed.missingDataDays} of the last 7 days missing data`}
            >
              {'⚠'}
            </span>
          )}
        </a>
      </div>

      <div>
        <p className="text-xs font-mono tracking-[0.15em] uppercase mb-2 text-text-tertiary">
          Weekly downloads
        </p>
        <p
          className={`text-4xl sm:text-5xl font-medium font-numeric ${isNegative ? 'text-negative' : 'text-accent'}`}
        >
          {formatNumber(computed.currentWeekDownloads)}
        </p>
      </div>

      <div className="mt-5 pt-5 flex gap-6 border-t border-border-subtle">
        <StatItem
          label="Week"
          value={computed.weekChangePercent}
          colorClass={getChangeClass(computed.weekChangePercent)}
          arrow={getArrow(computed.weekChangePercent)}
        />
        <StatItem
          label="Month"
          value={computed.monthChangePercent}
          colorClass={getChangeClass(computed.monthChangePercent)}
          arrow={getArrow(computed.monthChangePercent)}
        />
        <StatItem
          label="Year"
          value={computed.yearChangePercent}
          colorClass={getChangeClass(computed.yearChangePercent)}
          arrow={getArrow(computed.yearChangePercent)}
        />
      </div>
    </div>
  );
}

function StatItem({
  label,
  value,
  colorClass,
  arrow,
}: {
  label: string;
  value: number | null;
  colorClass: string;
  arrow: string;
}) {
  return (
    <div className="flex-1">
      <p className="text-xs tracking-[0.1em] uppercase mb-1 text-text-tertiary">
        {label}
      </p>
      <p className={`text-base font-medium font-numeric ${colorClass}`}>
        {arrow && <span className="mr-0.5 text-sm">{arrow}</span>}
        {formatChangePercent(value)}
      </p>
    </div>
  );
}
