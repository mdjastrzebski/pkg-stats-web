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
      className="rounded-2xl p-6 relative group animate-fade-slide-in bg-bg-card border border-border-subtle"
      style={{ animationDelay: `${index * 0.06}s` }}
    >
      <button
        onClick={onRemove}
        className="absolute top-6 right-5 p-1 cursor-pointer rounded-md transition-all duration-200 text-text-tertiary hover:text-red-400 hover:drop-shadow-[0_0_4px_rgba(248,113,113,0.4)]"
        aria-label={`Remove ${packageName}`}
      >
        <CloseIcon className="w-5 h-5" />
      </button>

      <div className="mb-4">
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

      <p className="text-sm mb-4 text-negative">{error.message}</p>

      <button
        onClick={onRetry}
        className="px-4 py-2 text-sm rounded-lg font-medium transition-all duration-200 cursor-pointer bg-bg-secondary border border-border-subtle text-text-secondary hover:border-border-accent hover:text-accent"
      >
        Retry
      </button>
    </div>
  );
}
