// Нечіткий пошук по списку в памʼяті (fuse.js).
//
// Навіщо не `includes`: підрядок вимагає точного збігу з початку слова й у
// правильному порядку. «сервіс тр» не знайде «Транспортний сервіс», а одна
// одруківка або зайвий пробіл дають порожній список — схоже на баг, хоча
// шукане є.
//
// Індекс тримаємо в computed: він перебудовується на зміну items, а не на
// кожне натискання клавіші (перебудова на символ — найдорожче, що тут можна
// зробити).

import Fuse, { type IFuseOptions } from 'fuse.js'
import { computed, toValue, type ComputedRef, type MaybeRefOrGetter } from 'vue'

// threshold 0.35 — компроміс: тримає одруківку й інше закінчення слова, але не
// віддає випадкове. ignoreLocation обовʼязковий: без нього збіг у кінці рядка
// важить менше за збіг на початку, і пошук за прізвищем у «Імʼя Прізвище» або
// за другим словом у назві парку працює гірше.
const DEFAULT_OPTIONS = {
  threshold: 0.35,
  ignoreLocation: true,
  minMatchCharLength: 1,
} as const satisfies IFuseOptions<unknown>

/**
 * Порожній запит віддає весь список як є — фільтр вмикається лише коли є що
 * шукати. Порядок результатів пошуку — за релевантністю (fuse), не вихідний.
 */
export function useFuzzySearch<T>(
  items: MaybeRefOrGetter<readonly T[]>,
  query: MaybeRefOrGetter<string>,
  keys: ReadonlyArray<string>,
): ComputedRef<T[]> {
  const index = computed(() => new Fuse(toValue(items), { ...DEFAULT_OPTIONS, keys: [...keys] }))

  return computed(() => {
    const term = toValue(query).trim()
    if (!term) return [...toValue(items)]

    return index.value.search(term).map(result => result.item)
  })
}
