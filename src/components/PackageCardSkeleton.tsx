import { calculatePackageNameFontSize } from '../utils/stats';

export function PackageCardSkeleton({
  packageName,
  index,
}: {
  packageName: string;
  index: number;
}) {
  const npmUrl = `https://www.npmjs.com/package/${packageName}?activeTab=versions`;

  return (
    <div
      className="rounded-2xl p-6 relative animate-fade-slide-in"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        animationDelay: `${index * 0.06}s`,
      }}
    >
      <div className="mb-5">
        <a
          href={npmUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold tracking-tight block pr-8 transition-colors duration-200 whitespace-nowrap"
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
      <div className="space-y-3">
        <div
          className="h-5 w-24 rounded-md animate-shimmer"
          style={{ opacity: 0.6 }}
        />
        <div
          className="h-10 w-40 rounded-md animate-shimmer"
          style={{ animationDelay: '0.1s', opacity: 0.6 }}
        />
        <div
          className="mt-5 pt-5 flex gap-6"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          <div className="flex-1 space-y-1.5">
            <div
              className="h-3 w-10 rounded animate-shimmer"
              style={{ animationDelay: '0.2s', opacity: 0.4 }}
            />
            <div
              className="h-5 w-14 rounded animate-shimmer"
              style={{ animationDelay: '0.25s', opacity: 0.4 }}
            />
          </div>
          <div className="flex-1 space-y-1.5">
            <div
              className="h-3 w-12 rounded animate-shimmer"
              style={{ animationDelay: '0.3s', opacity: 0.4 }}
            />
            <div
              className="h-5 w-14 rounded animate-shimmer"
              style={{ animationDelay: '0.35s', opacity: 0.4 }}
            />
          </div>
          <div className="flex-1 space-y-1.5">
            <div
              className="h-3 w-10 rounded animate-shimmer"
              style={{ animationDelay: '0.4s', opacity: 0.4 }}
            />
            <div
              className="h-5 w-14 rounded animate-shimmer"
              style={{ animationDelay: '0.45s', opacity: 0.4 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
