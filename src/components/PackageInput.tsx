import { useState, type FormEvent } from 'react';
import { validatePackageName } from '../utils/stats';

interface PackageInputProps {
  onAdd: (packageName: string) => void;
  isLoading?: boolean;
}

export function PackageInput({ onAdd, isLoading = false }: PackageInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();

    const validation = validatePackageName(trimmed);
    if (!validation.valid) {
      setError(validation.error || 'Invalid package name');
      return;
    }

    setError(null);
    onAdd(trimmed);
    setInputValue('');
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
      <div className="flex gap-3">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setError(null);
          }}
          placeholder="Enter NPM package name (e.g., react)"
          className="flex-1 px-5 py-4 border-2 border-slate-700/50 bg-slate-800 text-slate-100 placeholder-slate-500 tracking-wide focus:outline-none focus:border-purple-500/50 focus:bg-slate-800/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all"
          disabled={isLoading}
          aria-label="NPM package name input"
          aria-invalid={error !== null}
          aria-describedby={error ? 'package-input-error' : undefined}
        />
        <button
          type="submit"
          disabled={isLoading}
          className="px-8 py-4 border-2 border-slate-700/50 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:border-purple-500/50 hover:text-purple-400 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all tracking-wider text-lg rounded-lg font-medium"
          aria-label="Add package"
        >
          Add
        </button>
      </div>
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
    </form>
  );
}
