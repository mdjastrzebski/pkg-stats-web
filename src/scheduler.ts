interface TaskSchedulerOptions {
  maxConcurrent: number;
}

interface TaskOptions {
  priority: number;
}

export class TaskScheduler {
  private readonly maxConcurrent: number;

  constructor({ maxConcurrent }: TaskSchedulerOptions) {
    this.maxConcurrent = maxConcurrent;
  }

  public schedule<T>(task: () => Promise<T>, options: TaskOptions): Promise<T> {
    // TODO: implement
  }
}
