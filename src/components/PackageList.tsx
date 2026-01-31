import type { DeprecatedPackageStats } from '../types';
import { PackageCard } from './PackageCard';

interface PackageListProps {
  packages: DeprecatedPackageStats[];
  onRemove: (packageName: string) => void;
}

export function PackageList({ packages, onRemove }: PackageListProps) {
  if (packages.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-500 text-xl tracking-wider">
          No packages added yet. Add your first package above!
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {packages.map((pkg) => (
        <PackageCard
          key={pkg.packageName}
          stats={pkg}
          onRemove={() => onRemove(pkg.packageName)}
        />
      ))}
    </div>
  );
}
