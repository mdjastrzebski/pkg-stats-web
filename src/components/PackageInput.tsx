import { useState, type FormEvent, useEffect, useRef } from 'react';
import { validatePackageName } from '../utils/stats';
import { useAutocomplete } from '../hooks/use-autocomplete';
import { SpinnerIcon } from './icons/SpinnerIcon';

interface PackageInputProps {
  onAdd: (packageName: string) => void;
}

export function PackageInput({ onAdd }: PackageInputProps) {
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
              placeholder="Search packages..."
              className="w-full px-5 py-3.5 text-base sm:text-lg tracking-wide transition-all duration-300 rounded-xl outline-none bg-bg-input border border-border-subtle text-text-primary focus:border-border-accent focus:shadow-[0_0_0_3px_var(--color-accent-glow)]"
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
                className="absolute z-50 w-full mt-2 rounded-xl shadow-2xl max-h-72 overflow-y-auto dropdown-scroll bg-bg-secondary border border-border-medium"
              >
                {suggestions.map((suggestion, index) => (
                  <button
                    key={suggestion.name}
                    type="button"
                    role="option"
                    aria-selected={index === selectedIndex}
                    onClick={() => selectSuggestion(suggestion)}
                    className={`w-full text-left px-5 py-3.5 transition-all duration-200 cursor-pointer border-l-2 first:rounded-t-xl last:rounded-b-xl ${
                      index === selectedIndex
                        ? 'bg-accent-dim border-l-accent'
                        : 'bg-transparent border-l-transparent hover:bg-accent-glow'
                    }`}
                  >
                    <div
                      className={`font-medium text-base font-mono ${
                        index === selectedIndex
                          ? 'text-accent'
                          : 'text-text-primary'
                      }`}
                    >
                      {suggestion.name}
                    </div>
                    {suggestion.description && (
                      <div className="text-sm mt-0.5 line-clamp-1 text-text-tertiary">
                        {suggestion.description}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
            {isSearching && query.trim().length >= 2 && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <SpinnerIcon className="animate-spin h-4 w-4 text-accent" />
              </div>
            )}
          </div>
          <button
            type="submit"
            className="w-full sm:w-auto px-7 py-3.5 text-base sm:text-lg rounded-xl font-medium tracking-wide whitespace-nowrap transition-all duration-300 cursor-pointer bg-accent-dim border border-border-accent text-accent hover:bg-[rgba(99,234,190,0.25)] hover:shadow-[0_0_20px_var(--color-accent-glow)]"
            aria-label="Add package"
          >
            Add
          </button>
        </div>
      </form>
      {error && (
        <p
          id="package-input-error"
          className="mt-3 text-sm tracking-wide text-negative"
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
      )}
    </div>
  );
}
