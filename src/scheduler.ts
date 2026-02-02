import PQueue from 'p-queue';
import { FetchError } from './types';

export interface RequestSchedulerOptions {
  maxConcurrent?: number;
  maxRetries?: number;
  baseDelayMs?: number;
  rateLimitBaseDelayMs?: number;
}

interface RequestSchedulerConfig {
  maxRetries: number;
  baseDelayMs: number;
  rateLimitBaseDelayMs: number;
}

export class RequestScheduler {
  private readonly queue: PQueue;
  private readonly config: RequestSchedulerConfig;

  constructor({ maxConcurrent, ...restConfig }: RequestSchedulerOptions = {}) {
    this.queue = new PQueue({ concurrency: maxConcurrent });
    this.config = {
      maxRetries: restConfig.maxRetries ?? 3,
      baseDelayMs: restConfig.baseDelayMs ?? 1000,
      rateLimitBaseDelayMs: restConfig.rateLimitBaseDelayMs ?? 5000,
    };
  }

  public schedule<T>(task: () => Promise<T>): Promise<T> {
    return this.queue.add(() => this.executeWithRetry(task)) as Promise<T>;
  }

  private async executeWithRetry<T>(
    task: () => Promise<T>,
    attempt: number = 0,
  ): Promise<T> {
    try {
      return await task();
    } catch (error) {
      if (attempt >= this.config.maxRetries) {
        throw error;
      }

      const delay = this.calculateBackoff(error, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));

      return this.executeWithRetry(task, attempt + 1);
    }
  }

  private calculateBackoff(error: unknown, attempt: number): number {
    if (error instanceof FetchError && error.status === 429) {
      const retryAfter = this.extractRetryAfter(error.response);
      if (retryAfter !== null) {
        return retryAfter * 1000;
      }
      return this.config.rateLimitBaseDelayMs * 2 ** attempt;
    }
    return this.config.baseDelayMs * 2 ** attempt;
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
