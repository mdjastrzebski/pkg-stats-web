import { calculatePackageNameFontSize } from '../utils/stats';
import { CloseIcon } from './icons/CloseIcon';

export function PackageCardError({
  packageName,
  error,
  onRemove,
  onRetry,
  index,
}: {
  packageName: string;
  error: Error;
  onRemove: () => void;
  onRetry: () => void;
  index: number;
}) {
  const npmUrl = `https://www.npmjs.com/package/${packageName}?activeTab=versions`;

  return (
    <div
      className="rounded-2xl p-6 relative group animate-fade-slide-in"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        animationDelay: `${index * 0.06}s`,
      }}
    >
      <button
        onClick={onRemove}
        className="absolute top-6 right-5 p-1 cursor-pointer rounded-md transition-all duration-200"
        style={{ color: 'var(--text-tertiary)' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = '#f87171';
          e.currentTarget.style.filter = 'drop-shadow(0 0 4px rgba(248, 113, 113, 0.4))';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'var(--text-tertiary)';
          e.currentTarget.style.filter = 'none';
        }}
        aria-label={`Remove ${packageName}`}
      >
        <CloseIcon className="w-5 h-5" />
      </button>

      <div className="mb-4">
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
          title={packageName}
        >
          {packageName}
        </a>
      </div>

      <p className="text-sm mb-4" style={{ color: 'var(--negative)' }}>
        {error.message}
      </p>

      <button
        onClick={onRetry}
        className="px-4 py-2 text-sm rounded-lg font-medium transition-all duration-200 cursor-pointer"
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          color: 'var(--text-secondary)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-accent)';
          e.currentTarget.style.color = 'var(--accent)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-subtle)';
          e.currentTarget.style.color = 'var(--text-secondary)';
        }}
      >
        Retry
      </button>
    </div>
  );
}
