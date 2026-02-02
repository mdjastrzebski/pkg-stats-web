import { useState, type FormEvent, useEffect, useRef } from 'react';
import { validatePackageName } from '../utils/stats';
import { useAutocomplete } from '../hooks/use-autocomplete';

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
              className="w-full px-5 py-3.5 text-base sm:text-lg tracking-wide transition-all duration-300 rounded-xl outline-none"
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-accent)';
                e.currentTarget.style.boxShadow =
                  '0 0 0 3px var(--accent-glow)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
                e.currentTarget.style.boxShadow = 'none';
              }}
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
                className="absolute z-50 w-full mt-2 rounded-xl shadow-2xl max-h-72 overflow-y-auto dropdown-scroll"
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-medium)',
                }}
              >
                {suggestions.map((suggestion, index) => (
                  <button
                    key={suggestion.name}
                    type="button"
                    role="option"
                    aria-selected={index === selectedIndex}
                    onClick={() => selectSuggestion(suggestion)}
                    className="w-full text-left px-5 py-3.5 transition-all duration-200 cursor-pointer"
                    style={{
                      background:
                        index === selectedIndex
                          ? 'var(--accent-dim)'
                          : 'transparent',
                      borderLeft:
                        index === selectedIndex
                          ? '2px solid var(--accent)'
                          : '2px solid transparent',
                      borderRadius:
                        index === 0
                          ? '0.75rem 0.75rem 0 0'
                          : index === suggestions.length - 1
                            ? '0 0 0.75rem 0.75rem'
                            : '0',
                    }}
                    onMouseEnter={(e) => {
                      if (index !== selectedIndex) {
                        e.currentTarget.style.background = 'var(--accent-glow)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (index !== selectedIndex) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <div
                      className="font-medium text-base font-mono"
                      style={{
                        color:
                          index === selectedIndex
                            ? 'var(--accent)'
                            : 'var(--text-primary)',
                      }}
                    >
                      {suggestion.name}
                    </div>
                    {suggestion.description && (
                      <div
                        className="text-sm mt-0.5 line-clamp-1"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        {suggestion.description}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
            {isSearching && query.trim().length >= 2 && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <svg
                  className="animate-spin h-4 w-4"
                  style={{ color: 'var(--accent)' }}
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
            className="w-full sm:w-auto px-7 py-3.5 text-base sm:text-lg rounded-xl font-medium tracking-wide whitespace-nowrap transition-all duration-300 cursor-pointer"
            style={{
              background: 'var(--accent-dim)',
              border: '1px solid var(--border-accent)',
              color: 'var(--accent)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(99, 234, 190, 0.25)';
              e.currentTarget.style.boxShadow = '0 0 20px var(--accent-glow)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--accent-dim)';
              e.currentTarget.style.boxShadow = 'none';
            }}
            aria-label="Add package"
          >
            Add
          </button>
        </div>
      </form>
      {error && (
        <p
          id="package-input-error"
          className="mt-3 text-sm tracking-wide"
          style={{ color: 'var(--negative)' }}
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
      )}
    </div>
  );
}
