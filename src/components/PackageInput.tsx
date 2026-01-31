import { useState, type FormEvent, useEffect, useRef } from 'react';
import { validatePackageName } from '../utils/stats';
import { useAutocomplete } from '../hooks/use-autocomplete';

interface PackageInputProps {
  onAdd: (packageName: string) => void;
  isLoading?: boolean;
}

export function PackageInput({ onAdd, isLoading = false }: PackageInputProps) {
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    query,
    suggestions,
    isLoading: isSearching,
    selectedIndex,
    isOpen,
    updateQuery,
    handleKeyDown,
    selectSuggestion,
    close,
  } = useAutocomplete({
    onSelect: (value) => {
      const validation = validatePackageName(value);
      if (validation.valid) {
        setError(null);
        onAdd(value);
        updateQuery('');
      }
    },
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        close();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen, close]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();

    const validation = validatePackageName(trimmed);
    if (!validation.valid) {
      setError(validation.error || 'Invalid package name');
      return;
    }

    setError(null);
    onAdd(trimmed);
    updateQuery('');
    close();
  };

  return (
    <div ref={containerRef} className="w-full max-w-2xl mx-auto relative">
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={query}
              onChange={(e) => {
                updateQuery(e.target.value);
                setError(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Enter NPM package name"
              className="w-full px-4 sm:px-5 py-3 sm:py-4 border-2 border-slate-700/50 bg-slate-800 text-slate-100 placeholder-slate-500 tracking-wide focus:outline-none focus:border-violet-500/50 focus:bg-slate-800/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all text-base sm:text-lg"
              disabled={isLoading}
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              autoComplete="off"
              aria-label="NPM package name input"
              aria-invalid={error !== null}
              aria-describedby={error ? 'package-input-error' : undefined}
              aria-autocomplete="list"
              aria-expanded={isOpen}
              aria-controls="package-suggestions"
            />
            {isOpen && suggestions.length > 0 && (
              <div
                id="package-suggestions"
                role="listbox"
                className="absolute z-50 w-full mt-2 bg-slate-800 border-2 border-slate-700/50 rounded-lg shadow-xl max-h-64 overflow-y-auto"
              >
                {suggestions.map((suggestion, index) => (
                  <button
                    key={suggestion.name}
                    type="button"
                    role="option"
                    aria-selected={index === selectedIndex}
                    onClick={() => selectSuggestion(suggestion)}
                    className={`w-full text-left px-4 py-3 hover:bg-slate-700/50 transition-colors ${
                      index === selectedIndex
                        ? 'bg-violet-500/20 border-l-4 border-violet-500'
                        : ''
                    } ${index === 0 ? 'rounded-t-lg' : ''} ${
                      index === suggestions.length - 1 ? 'rounded-b-lg' : ''
                    }`}
                  >
                    <div className="text-slate-100 font-medium text-base">
                      {suggestion.name}
                    </div>
                    {suggestion.description && (
                      <div className="text-slate-400 text-sm mt-1 line-clamp-1">
                        {suggestion.description}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
            {isSearching && query.trim().length >= 2 && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <svg
                  className="animate-spin h-5 w-5 text-violet-400"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 border-2 border-slate-700/50 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:border-violet-500/50 hover:text-violet-400 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all tracking-wider text-base sm:text-lg rounded-lg font-medium whitespace-nowrap"
            aria-label="Add package"
          >
            Add
          </button>
        </div>
      </form>
      {error && (
        <p
          id="package-input-error"
          className="mt-3 text-sm text-red-400 tracking-wide"
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
      )}
    </div>
  );
}
