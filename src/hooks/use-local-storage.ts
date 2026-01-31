import { useState, useEffect } from 'react';

const STORAGE_KEY = 'npm-stats-favorites';

export function useLocalStorage(): {
  packages: string[];
  addPackage: (packageName: string) => void;
  removePackage: (packageName: string) => void;
} {
  const [packages, setPackages] = useState<string[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return [];
      }
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(packages));
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name === 'QuotaExceededError'
      ) {
        console.error('LocalStorage quota exceeded. Cannot save packages.');
      } else {
        console.error('Error saving to localStorage:', error);
      }
    }
  }, [packages]);

  const addPackage = (packageName: string) => {
    const normalized = packageName.trim().toLowerCase();
    if (normalized && !packages.includes(normalized)) {
      setPackages((prev) => [...prev, normalized]);
    }
  };

  const removePackage = (packageName: string) => {
    setPackages((prev) => prev.filter((pkg) => pkg !== packageName));
  };

  return { packages, addPackage, removePackage };
}
