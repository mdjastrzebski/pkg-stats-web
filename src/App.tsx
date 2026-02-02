import { useEffect } from 'react';
import { useLocalStorage } from './hooks/use-local-storage';
import { PackageInput } from './components/PackageInput';
import { PackageList } from './components/PackageList';

function App() {
  const { packages, addPackage, removePackage } = useLocalStorage();

  // One-time cleanup of stale localStorage cache entries (can be removed in a future release)
  useEffect(() => {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('npm_stats_cache_')) {
        localStorage.removeItem(key);
      }
    }
  }, []);

  const handleAddPackage = (packageName: string) => {
    addPackage(packageName);
  };

  const handleRemovePackage = (packageName: string) => {
    removePackage(packageName);
  };

  return (
    <div className="min-h-screen bg-slate-950 py-8 px-4 sm:px-6 w-full">
      <div className="max-w-7xl mx-auto w-full">
        <header className="text-center mb-12">
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

        <PackageList packages={packages} onRemove={handleRemovePackage} />
      </div>
    </div>
  );
}

export default App;
