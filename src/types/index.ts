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
	currentWeekDownloads: number | null;
	previousWeekDownloads: number | null;
	change: number | null;
	changePercent: number | null;
	currentMonthDownloads: number | null;
	previousMonthDownloads: number | null;
	monthChange: number | null;
	monthChangePercent: number | null;
	currentYearDownloads: number | null;
	previousYearDownloads: number | null;
	yearChange: number | null;
	yearChangePercent: number | null;
	isLoading: boolean;
	isStale: boolean;
	error: string | null;
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
