// Форма, що зараз відправляється. Помилка поля — під полем, помилка форми в цілому — тостом.
// Поки сабміт іде, `handleApiError` не тостить одразу, а відкладає: форма забирає відмову,
// яку вся показала під полями на екрані; решту (помилку форми, поле, якого не видно,
// відмову, яку сабміт проковтнув сам, чужий запит) показуємо тостом, щойно сабміт скінчився.
// Так людина не бачить той самий текст двічі і не лишається без жодного.

interface Pending {
  error: unknown
  notify: () => void
  done: boolean
}

const active = new Set<Pending[]>()

export const FormErrorScope = {
  /**
   * Сабміт форми. `claim(error)` — форма показала цю відмову під полями, тост не потрібен.
   * Незабрані відмови, що прийшли під час сабміту, тостяться в кінці.
   */
  async run<T>(action: (claim: (error: unknown) => void) => Promise<T>): Promise<T> {
    const pending: Pending[] = []
    active.add(pending)

    const claim = (error: unknown): void => {
      for (const item of pending) {
        if (item.error === error) item.done = true
      }
    }

    try {
      return await action(claim)
    } finally {
      active.delete(pending)
      for (const item of pending) {
        if (item.done) continue
        item.done = true
        item.notify()
      }
    }
  },

  /** Відкласти показ, якщо зараз іде сабміт форми: `true` — відкладено, показувати не треба. */
  defer(error: unknown, notify: () => void): boolean {
    if (active.size === 0) return false

    const item: Pending = { error, notify, done: false }
    for (const pending of active) pending.push(item)

    return true
  },
}
