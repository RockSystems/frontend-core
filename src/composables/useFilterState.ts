// Примітиви фільтрів стора: дебаунснутий текст і пара сортування.
// Живуть тут, бо їх чекає useServerTable — форма має збігатися.

import { watchDebounced } from '@vueuse/core'
import { ref, type Ref } from 'vue'
import { SEARCH_DEBOUNCE_MS } from '../lib/timings'
import type { SortDirection } from './useServerTable'

/**
 * Текстовий фільтр «draft → committed»: `draft` пише UI миттєво, `committed`
 * відстає на дебаунс і йде в queryKey. Draft тримаємо в сторі, а не в
 * компоненті фільтрів, — інакше він губиться при перемонтуванні.
 *
 * `normalize` застосовується до committed, не до draft: користувач бачить те,
 * що набрав, а на бек їде причесане (номер авто без пробілів тощо).
 */
export function useDebouncedFilter(
  initial: string,
  normalize?: (raw: string) => string,
): { committed: Ref<string>; draft: Ref<string> } {
  const apply = (raw: string) => (normalize ? normalize(raw) : raw)

  const draft = ref(initial)
  const committed = ref(apply(initial))
  watchDebounced(draft, raw => { committed.value = apply(raw) }, { debounce: SEARCH_DEBOUNCE_MS })

  return { committed, draft }
}

/** Пара sortBy/sortDirection + setSort — рівно те, що споживає useServerTable. */
export function useSortState<TSortBy extends string>(
  initialBy: TSortBy | null,
  initialDirection: SortDirection | null,
) {
  const sortBy = ref(initialBy) as Ref<TSortBy | null>
  const sortDirection = ref(initialDirection) as Ref<SortDirection | null>

  // by=null (скидання кліком у TanStack) знімає й напрямок, інакше в URL
  // лишається sort_dir без sort_by.
  function setSort(by: TSortBy | null, dir: SortDirection | null = 'asc'): void {
    sortBy.value = by
    sortDirection.value = by ? dir : null
  }

  return { sortBy, sortDirection, setSort }
}

/**
 * Пара «менеджери / без менеджера». Взаємовиключна: бек складає фільтри через
 * AND, тож «водії Влада» + «нічиї» дали б завжди порожню таблицю. Правило було
 * скопійоване в чотири стори — сюди його, щоб не тримати чотири шанси забути.
 */
export function useManagerFilter(initialIds: string[] = [], initialWithout = false) {
  // Адреса з обома (`manager_id=…&without_manager=1`) дала б 422 від бека:
  // «без менеджера» перекриває, як і в сеттері.
  const managerIds = ref<string[]>(initialWithout ? [] : initialIds)
  const isWithoutManager = ref(initialWithout)

  function setManagerIds(next: string[]): void {
    managerIds.value = next
    if (next.length > 0) isWithoutManager.value = false
  }

  function setWithoutManager(next: boolean): void {
    isWithoutManager.value = next
    if (next) managerIds.value = []
  }

  return { managerIds, isWithoutManager, setManagerIds, setWithoutManager }
}
