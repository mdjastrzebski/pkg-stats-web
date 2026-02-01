import PQueue from 'p-queue';
import { FetchError } from './types';

interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  rateLimitBaseDelayMs: number;
}

interface TaskSchedulerOptions {
  maxConcurrent: number;
  retryConfig?: Partial<RetryConfig>;
}

interface TaskOptions {
  retryConfig?: Partial<RetryConfig>;
}

export class TaskScheduler {
  private readonly queue: PQueue;
  private readonly defaultRetryConfig: RetryConfig;

  constructor({ maxConcurrent, retryConfig }: TaskSchedulerOptions) {
    this.queue = new PQueue({ concurrency: maxConcurrent });
    this.defaultRetryConfig = {
      maxRetries: 3,
      baseDelayMs: 1000,
      rateLimitBaseDelayMs: 5000,
      ...retryConfig,
    };
  }

  public schedule<T>(
    task: () => Promise<T>,
    options?: TaskOptions,
  ): Promise<T> {
    const config = { ...this.defaultRetryConfig, ...options?.retryConfig };
    return this.queue.add(() =>
      this.executeWithRetry(task, config),
    ) as Promise<T>;
  }

  private async executeWithRetry<T>(
    task: () => Promise<T>,
    config: RetryConfig,
    attempt: number = 0,
  ): Promise<T> {
    try {
      return await task();
    } catch (error) {
      if (attempt >= config.maxRetries) {
        throw error;
      }

      const delay = this.calculateBackoff(error, attempt, config);
      await new Promise((resolve) => setTimeout(resolve, delay));

      return this.executeWithRetry(task, config, attempt + 1);
    }
  }

  private calculateBackoff(
    error: unknown,
    attempt: number,
    config: RetryConfig,
  ): number {
    if (error instanceof FetchError && error.status === 429) {
      const retryAfter = this.extractRetryAfter(error.response);
      if (retryAfter !== null) {
        return retryAfter * 1000;
      }
      return config.rateLimitBaseDelayMs * Math.pow(2, attempt);
    }
    return config.baseDelayMs * Math.pow(2, attempt);
  }

  private extractRetryAfter(response: Response): number | null {
    const retryAfter = response.headers.get('Retry-After');
    if (!retryAfter) {
      return null;
    }

    const seconds = parseInt(retryAfter, 10);
    if (!Number.isNaN(seconds)) {
      return seconds;
    }

    const date = new Date(retryAfter);
    if (!Number.isNaN(date.getTime())) {
      const now = Date.now();
      const retryTime = date.getTime();
      return Math.max(0, Math.floor((retryTime - now) / 1000));
    }

    return null;
  }
}
