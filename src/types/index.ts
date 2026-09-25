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
   * Number of most-recent days (up to 7) that report zero downloads or have no
   * data at all, indicating the NPM API has not finalized those days yet. All
   * week/month/year windows are shifted back by this many days so comparisons
   * end on the last day with data. Always 0 for packages without an
   * established download history, where zero-download days are expected.
   */
  dataDelayDays: number;
  /**
   * Number of days in the current month window (last 30 days of data) that
   * reported zero downloads despite an established history and were estimated
   * from the same weekday in nearby weeks.
   */
  estimatedDays: number;
}

export interface ComputedPackageStats {
  packageName: string;
  currentWeekDownloads: number;
  weekChangePercent: number | null;
  monthChangePercent: number | null;
  yearChangePercent: number | null;
  dataDelayDays: number;
  estimatedDays: number;
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
