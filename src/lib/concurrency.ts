// Семафор: ограничивает число одновременно выполняемых асинхронных операций.
// Для пачки запросов, когда bulk-эндпоинта нет: сотня параллельных бэк не переживёт.

export class Semaphore {
  private inFlight = 0
  private queue: Array<() => void> = []

  constructor(private readonly limit: number) {
    if (limit < 1) throw new Error('Semaphore limit must be >= 1')
  }

  private async acquire(): Promise<void> {
    if (this.inFlight < this.limit) {
      this.inFlight++
      return
    }
    await new Promise<void>(resolve => this.queue.push(resolve))
    this.inFlight++
  }

  private release(): void {
    this.inFlight--
    const next = this.queue.shift()
    if (next) next()
  }

  async run<T>(task: () => Promise<T>): Promise<T> {
    await this.acquire()
    try {
      return await task()
    } finally {
      this.release()
    }
  }
}
