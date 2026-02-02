import { useState } from 'react';
import { useLocalStorage } from './hooks/use-local-storage';
import { clearAllCache } from './services/npm-api';
import { invalidateAllPromises } from './services/promise-cache';
import { PackageInput } from './components/PackageInput';
import { PackageList } from './components/PackageList';

function App() {
  const { packages, addPackage, removePackage } = useLocalStorage();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    clearAllCache();
    invalidateAllPromises();
    setRefreshKey((prev) => prev + 1);
  };

  const handleAddPackage = (packageName: string) => {
    addPackage(packageName);
  };

  const handleRemovePackage = (packageName: string) => {
    removePackage(packageName);
  };

  return (
    <div className="min-h-screen bg-slate-950 py-8 px-4 sm:px-6 w-full">
      <div className="max-w-7xl mx-auto w-full">
        <header className="relative text-center mb-12">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={packages.length === 0}
            className="absolute top-0 right-0 p-3 border-2 border-slate-700/50 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:border-violet-500/50 hover:text-violet-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold rounded-lg"
            aria-label="Refresh stats"
            title="Refresh stats"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={3}
            >
              <path
                strokeLinecap="square"
                strokeLinejoin="miter"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
          <h1 className="text-6xl font-bold text-slate-100 mb-4 tracking-tight">
            NPM Package Stats
          </h1>
          <p className="text-slate-400 text-lg">
            Track download statistics for your favorite{' '}
            <span className="text-violet-400">NPM packages</span>
          </p>
        </header>

        <div className="mb-8">
          <PackageInput onAdd={handleAddPackage} />
        </div>

        <div key={refreshKey}>
          <PackageList packages={packages} onRemove={handleRemovePackage} />
        </div>
      </div>
    </div>
  );
}

export default App;
