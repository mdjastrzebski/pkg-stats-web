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
  packageName: string;
  currentWeekDownloads: number;
  previousWeekDownloads: number;
  change: number;
  changePercent: number;
  isLoading: boolean;
  error: string | null;
}
