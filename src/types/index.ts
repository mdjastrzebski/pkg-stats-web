export interface DownloadData {
  downloads: Array<{
    downloads: number;
    day: string;
  }>;
  start: string;
  end: string;
  package: string;
}

export interface PackageStats {
  name: string;
  weeklyCurrent: number;
  weeklyPrevious: number;
  monthlyCurrent: number;
  monthlyPrevious: number;
  yearlyCurrent: number;
  yearlyPrevious: number;
  /**
   * Number of days within the recent window (last 7 days) that report zero
   * downloads or have no data at all, indicating the NPM API has not finalized
   * those days yet. Always 0 for packages without an established download
   * history, where recent zero-download days are expected rather than a signal.
   * Treat any value > 0 as "stats may be unreliable".
   */
  missingDataDays: number;
}

export interface ComputedPackageStats {
  packageName: string;
  currentWeekDownloads: number;
  weekChangePercent: number | null;
  monthChangePercent: number | null;
  yearChangePercent: number | null;
  missingDataDays: number;
}

export class FetchError extends Error {
  readonly status: number;
  readonly response: Response;

  constructor(message: string, status: number, response: Response) {
    super(message);
    this.name = 'FetchError';
    this.status = status;
    this.response = response;
  }
}
