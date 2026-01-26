/**
 * Validate NPM package name format
 * NPM package names:
 * - Can be lowercase letters, numbers, hyphens, underscores, dots
 * - Can be scoped (e.g., @scope/package)
 * - Cannot start with dot or underscore (unless scoped)
 * - Cannot contain spaces or special characters
 * - Length must be between 1 and 214 characters
 */
export function validatePackageName(packageName: string): { valid: boolean; error?: string } {
  const trimmed = packageName.trim();
  
  if (!trimmed) {
    return { valid: false, error: 'Please enter a package name' };
  }

  if (trimmed.length > 214) {
    return { valid: false, error: 'Package name is too long (max 214 characters)' };
  }

  // Scoped package format: @scope/package
  const scopedPattern = /^@[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9._-]*$/;
  // Unscoped package format: package-name
  const unscopedPattern = /^[a-z0-9][a-z0-9._-]*$/;

  if (trimmed.startsWith('@')) {
    // Scoped package
    if (!scopedPattern.test(trimmed)) {
      return {
        valid: false,
        error: 'Invalid scoped package name format. Use: @scope/package-name',
      };
    }
  } else {
    // Unscoped package
    if (!unscopedPattern.test(trimmed)) {
      return {
        valid: false,
        error: 'Invalid package name. Use only lowercase letters, numbers, hyphens, dots, and underscores',
      };
    }
  }

  // Additional checks: cannot start with dot or underscore (for unscoped)
  if (!trimmed.startsWith('@') && (trimmed.startsWith('.') || trimmed.startsWith('_'))) {
    return {
      valid: false,
      error: 'Package name cannot start with a dot or underscore',
    };
  }

  return { valid: true };
}

/**
 * Calculate the percentage change between two values
 * Returns null if either value is null or if previous period is 0
 */
export function calculateChangePercent(
  current: number | null,
  previous: number | null
): number | null {
  if (current === null || previous === null) {
    return null;
  }
  if (previous === 0) {
    return null;
  }
  return ((current - previous) / previous) * 100;
}

/**
 * Format a number with commas for readability
 * Returns '-' if value is null
 */
export function formatNumber(num: number | null): string {
  if (num === null) {
    return '-';
  }
  return new Intl.NumberFormat('en-US').format(num);
}

/**
 * Format a number to 3 significant digits
 */
function toSignificantDigits(num: number, digits: number): string {
  if (num === 0) {
    return '0';
  }
  
  // Use toPrecision to get significant digits
  const precision = num.toPrecision(digits);
  
  // If toPrecision returns scientific notation, convert to regular decimal
  if (precision.includes('e')) {
    const numValue = parseFloat(precision);
    // For very small numbers, use exponential notation as fallback
    // But try to avoid it by using more decimal places if needed
    if (Math.abs(numValue) < 0.001) {
      return numValue.toExponential(2);
    }
    return numValue.toString();
  }
  
  // Remove trailing zeros after decimal point
  const numValue = parseFloat(precision);
  return numValue.toString();
}

/**
 * Calculate the change (difference) between two values
 * Returns null if either value is null
 */
export function calculateChange(
  current: number | null,
  previous: number | null
): number | null {
  if (current === null || previous === null) {
    return null;
  }
  return current - previous;
}

/**
 * Format percentage change with sign and color indication
 * Returns '-' if value is null
 * Formats to 2 significant digits
 */
export function formatChangePercent(percent: number | null): string {
  if (percent === null) {
    return '-';
  }
  const sign = percent >= 0 ? '+' : '';
  const formatted = toSignificantDigits(percent, 2);
  return `${sign}${formatted}%`;
}
