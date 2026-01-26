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
