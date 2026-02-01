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
}

export interface ComputedPackageStats {
  packageName: string;
  currentWeekDownloads: number;
  weekChangePercent: number | null;
  monthChangePercent: number | null;
  yearChangePercent: number | null;
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
