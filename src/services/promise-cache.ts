import type { PackageStats } from "../types";
import { getPackageStats } from "./npm-api";

// Simple module-level promise cache to prevent duplicate fetches
const promiseCache = new Map<string, Promise<PackageStats>>();

export function getCachedPromise(
  packageName: string,
  onResolve?: (stats: PackageStats) => void
): Promise<PackageStats> {
  if (promiseCache.has(packageName)) {
    return promiseCache.get(packageName)!;
  }

  const promise = getPackageStats(packageName, false).then((stats) => {
    if (stats === null) {
      throw new Error("No data available for this package");
    }

    onResolve?.(stats);
    return stats;
  });
  promiseCache.set(packageName, promise);
  return promise;
}

export function invalidatePromise(packageName: string): void {
  promiseCache.delete(packageName);
}

export function invalidateAllPromises(): void {
  promiseCache.clear();
}
