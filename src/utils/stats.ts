import type { PackageStats, ComputedPackageStats } from '../types';

const MAX_PACKAGE_NAME_LENGTH = 214;

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validatePackageName(packageName: string): ValidationResult {
  const trimmed = packageName.trim();

  if (!trimmed) {
    return { valid: false, error: 'Please enter a package name' };
  }

  if (trimmed.length > MAX_PACKAGE_NAME_LENGTH) {
    return {
      valid: false,
      error: `Package name is too long (maximum ${MAX_PACKAGE_NAME_LENGTH} characters)`,
    };
  }

  const scopedPattern = /^@[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9._-]*$/;
  const unscopedPattern = /^[a-z0-9][a-z0-9._-]*$/;

  if (trimmed.startsWith('@')) {
    if (!scopedPattern.test(trimmed)) {
      return {
        valid: false,
        error: 'Invalid scoped package name format. Use: @scope/package-name',
      };
    }
  } else {
    if (!unscopedPattern.test(trimmed)) {
      return {
        valid: false,
        error:
          'Invalid package name. Use only lowercase letters, numbers, hyphens, dots, and underscores',
      };
    }
  }

  if (
    !trimmed.startsWith('@') &&
    (trimmed.startsWith('.') || trimmed.startsWith('_'))
  ) {
    return {
      valid: false,
      error: 'Package name cannot start with a dot or underscore',
    };
  }

  return { valid: true };
}

export function calculateChangePercent(
  current: number | null,
  previous: number | null,
): number | null {
  if (current === null || previous === null) {
    return null;
  }
  if (previous === 0) {
    return null;
  }
  return ((current - previous) / previous) * 100;
}

export function formatNumber(num: number | null): string {
  if (num === null) {
    return '-';
  }

  if (num === 0) {
    return '0';
  }

  const rounded = parseFloat(toSignificantDigits(num, 3));
  return new Intl.NumberFormat('en-US').format(rounded);
}

function toSignificantDigits(num: number, digits: number): string {
  if (num === 0) {
    return '0';
  }

  const precision = num.toPrecision(digits);

  if (precision.includes('e')) {
    const numValue = parseFloat(precision);
    if (Math.abs(numValue) < 0.001) {
      return numValue.toExponential(2);
    }
    return numValue.toString();
  }

  const numValue = parseFloat(precision);
  return numValue.toString();
}

export function calculatePackageNameFontSize(
  packageName: string,
  baseSize: number = 1.5,
  threshold: number = 35,
  scaleFactor: number = 0.02,
  minSize: number = 0.875,
): string {
  if (packageName.length <= threshold) {
    return `${baseSize}rem`;
  }
  const scaledSize = Math.max(
    minSize,
    baseSize - (packageName.length - threshold) * scaleFactor,
  );
  return `${scaledSize}rem`;
}

export function formatChangePercent(percent: number | null): string {
  if (percent === null) {
    return '-';
  }
  const absPercent = Math.abs(percent);

  let formatted: string;
  let suffix = '';

  if (absPercent >= 1000000) {
    const millions = absPercent / 1000000;
    formatted = toSignificantDigits(millions, 2);
    suffix = 'M';
  } else if (absPercent >= 1000) {
    const thousands = absPercent / 1000;
    formatted = toSignificantDigits(thousands, 2);
    suffix = 'k';
  } else {
    formatted = toSignificantDigits(absPercent, 2);
  }

  return `${formatted}${suffix}%`;
}

export function computeStats(stats: PackageStats): ComputedPackageStats {
  return {
    packageName: stats.name,
    currentWeekDownloads: stats.weeklyCurrent,
    weekChangePercent: calculateChangePercent(
      stats.weeklyCurrent,
      stats.weeklyPrevious,
    ),
    monthChangePercent: calculateChangePercent(
      stats.monthlyCurrent,
      stats.monthlyPrevious,
    ),
    yearChangePercent: calculateChangePercent(
      stats.yearlyCurrent,
      stats.yearlyPrevious,
    ),
    missingDataDays: stats.missingDataDays,
  };
}
