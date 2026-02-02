import { calculatePackageNameFontSize } from '../utils/stats';

export function PackageCardError({
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
