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

  const getChangeColor = (percent: number | null): string => {
    if (percent === null) return 'var(--text-tertiary)';
    return percent >= 0 ? 'var(--positive)' : 'var(--negative)';
  };

  const getArrow = (percent: number | null): string => {
    if (percent === null) return '';
    return percent >= 0 ? '\u2191' : '\u2193';
  };

  const isNegative =
    computed.weekChangePercent !== null && computed.weekChangePercent < 0;
  const npmUrl = `https://www.npmjs.com/package/${packageName}?activeTab=versions`;

  return (
    <div
      className={`card-glow ${isNegative ? 'card-glow-negative' : ''} rounded-2xl px-6 pt-5 pb-6 transition-all duration-400 animate-fade-slide-in relative group`}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        animationDelay: `${index * 0.06}s`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--bg-card-hover)';
        e.currentTarget.style.borderColor = 'var(--border-medium)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'var(--bg-card)';
        e.currentTarget.style.borderColor = 'var(--border-subtle)';
      }}
    >
      <button
        onClick={onRemove}
        className="absolute top-5 right-5 p-1 cursor-pointer rounded-md transition-all duration-200"
        style={{ color: 'var(--text-tertiary)' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = '#f87171';
          e.currentTarget.style.filter =
            'drop-shadow(0 0 4px rgba(248, 113, 113, 0.4))';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'var(--text-tertiary)';
          e.currentTarget.style.filter = 'none';
        }}
        aria-label={`Remove ${packageName}`}
      >
        <CloseIcon className="w-5 h-5" />
      </button>

      <div className="mb-5">
        <a
          href={npmUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold tracking-tight block pr-8 transition-colors duration-200 overflow-hidden text-ellipsis"
          style={{
            fontSize: calculatePackageNameFontSize(packageName),
            lineHeight: '1.2',
            color: 'var(--text-primary)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--accent)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          title={packageName}
        >
          {packageName}
        </a>
      </div>

      <div>
        <p
          className="text-xs font-mono tracking-widest uppercase mb-2"
          style={{
            color: 'var(--text-tertiary)',
            letterSpacing: '0.15em',
          }}
        >
          Weekly downloads
        </p>
        <p
          className="text-4xl sm:text-5xl font-bold font-mono tracking-tighter"
          style={{
            color: isNegative ? 'var(--negative)' : 'var(--accent)',
          }}
        >
          {formatNumber(computed.currentWeekDownloads)}
        </p>
      </div>

      <div
        className="mt-5 pt-5 flex gap-6"
        style={{ borderTop: '1px solid var(--border-subtle)' }}
      >
        <StatItem
          label="Week"
          value={computed.weekChangePercent}
          color={getChangeColor(computed.weekChangePercent)}
          arrow={getArrow(computed.weekChangePercent)}
        />
        <StatItem
          label="Month"
          value={computed.monthChangePercent}
          color={getChangeColor(computed.monthChangePercent)}
          arrow={getArrow(computed.monthChangePercent)}
        />
        <StatItem
          label="Year"
          value={computed.yearChangePercent}
          color={getChangeColor(computed.yearChangePercent)}
          arrow={getArrow(computed.yearChangePercent)}
        />
      </div>
    </div>
  );
}

function StatItem({
  label,
  value,
  color,
  arrow,
}: {
  label: string;
  value: number | null;
  color: string;
  arrow: string;
}) {
  return (
    <div className="flex-1">
      <p
        className="text-xs tracking-wider uppercase mb-1"
        style={{
          color: 'var(--text-tertiary)',
          letterSpacing: '0.1em',
        }}
      >
        {label}
      </p>
      <p className="text-base font-semibold font-mono" style={{ color }}>
        {arrow && <span className="mr-0.5 text-sm">{arrow}</span>}
        {formatChangePercent(value)}
      </p>
    </div>
  );
}
