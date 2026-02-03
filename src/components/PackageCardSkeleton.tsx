import { calculatePackageNameFontSize } from '../utils/stats';
import { CloseIcon } from './icons/CloseIcon';

export function PackageCardSkeleton({
  packageName,
  index,
  onRemove,
}: {
  packageName: string;
  index: number;
  onRemove: () => void;
}) {
  const npmUrl = `https://www.npmjs.com/package/${packageName}?activeTab=versions`;

  return (
    <div
      className="rounded-2xl p-6 relative animate-fade-slide-in bg-bg-card border border-border-subtle"
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
          className="font-semibold tracking-tight block pr-8 transition-colors duration-200 overflow-hidden text-ellipsis text-text-primary leading-[1.2]"
          style={{ fontSize: calculatePackageNameFontSize(packageName) }}
          title={packageName}
        >
          {packageName}
        </a>
      </div>
      <div className="space-y-3">
        <div className="h-5 w-24 rounded-md animate-shimmer opacity-60" />
        <div
          className="h-10 w-40 rounded-md animate-shimmer opacity-60"
          style={{ animationDelay: '0.1s' }}
        />
        <div className="mt-5 pt-5 flex gap-6 border-t border-border-subtle">
          <div className="flex-1 space-y-1.5">
            <div
              className="h-3 w-10 rounded animate-shimmer opacity-40"
              style={{ animationDelay: '0.2s' }}
            />
            <div
              className="h-5 w-14 rounded animate-shimmer opacity-40"
              style={{ animationDelay: '0.25s' }}
            />
          </div>
          <div className="flex-1 space-y-1.5">
            <div
              className="h-3 w-12 rounded animate-shimmer opacity-40"
              style={{ animationDelay: '0.3s' }}
            />
            <div
              className="h-5 w-14 rounded animate-shimmer opacity-40"
              style={{ animationDelay: '0.35s' }}
            />
          </div>
          <div className="flex-1 space-y-1.5">
            <div
              className="h-3 w-10 rounded animate-shimmer opacity-40"
              style={{ animationDelay: '0.4s' }}
            />
            <div
              className="h-5 w-14 rounded animate-shimmer opacity-40"
              style={{ animationDelay: '0.45s' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
