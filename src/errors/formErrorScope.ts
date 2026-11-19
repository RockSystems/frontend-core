// Форма, що зараз відправляється. Помилка поля — під полем, помилка форми в цілому — тостом:
// поки сабміт іде, `handleApiError` питає тут, чи ляже відмова вся в поля, і тоді тост не показує.
// Інакше людина бачила б той самий текст двічі: під полем і в кутку.

type Covers = (error: unknown) => boolean

const active = new Set<Covers>()

export const FormErrorScope = {
  /** Виконати сабміт; поки він іде, помилки, які `covers` бере на себе, не тостяться. */
  async run<T>(covers: Covers, action: () => Promise<T>): Promise<T> {
    active.add(covers)
    try {
      return await action()
    } finally {
      active.delete(covers)
    }
  },

  /** Якась відкрита форма покаже цю помилку під своїми полями. */
  covers(error: unknown): boolean {
    for (const covers of active) {
      if (covers(error)) return true
    }
    return false
  },
}
