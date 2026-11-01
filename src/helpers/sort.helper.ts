// Стек мультисортування → параметр запиту.
//
// Бек читає `sort` як асоціативний масив, і ПОРЯДОК ключів у ньому = пріоритет.
// Тому збірка живе в одному місці: зібраний деінде spread'ом об'єкт міг би
// поїхати з переплутаним порядком, і таблиця мовчки відсортувалась би не так.
//
// Домену тут немає — ключі, підписи й напрямок першого кліку тримає реєстр полів
// таблиці (`TableFieldsHelper`), а це збірка параметра й спільні підписи.

import { SharedConfig } from '../config'
import type { ServerSortEntry, SortDirection } from '../composables/useServerTable'

export class SortHelper {
  /**
   * Підписи напрямків за родом значення: одне «Спадання» на всі сторінки.
   * Ознаки з власним змістом («Спочатку авто парку») словник фічі підписує сам.
   */
  static get DIRECTIONS() {
    return SharedConfig.get().labels.sortDirections
  }

  /**
   * Клік по шапці поза TanStack (своя таблиця): ключа немає — додати в кінець з
   * напрямком першого кліку, є з ним — розвернути, розвернутий — прибрати. Той
   * самий цикл, що TanStack веде для звичайних таблиць.
   */
  static toggle<T extends string>(
    sort: ReadonlyArray<ServerSortEntry<T>>,
    by: T,
    first: SortDirection,
  ): Array<ServerSortEntry<T>> {
    const current = sort.find(entry => entry.by === by)

    if (!current) return [...sort, { by, direction: first }]

    if (current.direction === first) {
      const flipped: SortDirection = first === 'asc' ? 'desc' : 'asc'

      return sort.map(entry => entry.by === by ? { by, direction: flipped } : entry)
    }

    return sort.filter(entry => entry.by !== by)
  }

  /** Порожній список → `undefined`: бек вимагає непорожній `sort`. */
  static toParam<T extends string>(
    sort: ReadonlyArray<ServerSortEntry<T>>,
  ): Record<string, SortDirection> | undefined {
    if (sort.length === 0) return undefined

    return sort.reduce<Record<string, SortDirection>>((acc, entry) => {
      acc[entry.by] = entry.direction

      return acc
    }, {})
  }
}
