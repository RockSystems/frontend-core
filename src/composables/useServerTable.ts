// Міст «наш стор ↔ TanStack» для серверних таблиць: сортування + стани порожньо/
// завантаження. Рядки приходять порціями при прокрутці (useVirtualTable).

import type { SortingState } from '@tanstack/vue-table'
import { computed } from 'vue'
import type { SortDirection } from '../api/types'
import type { ColumnsMap } from '../helpers/tableFields.helper'

// Тип — у контракті API (`_shared/api/types`); тут лише для звичних імпортів фіч.
export type { SortDirection }

/** Зріз стора, потрібний серверній таблиці. Сторі фіч його вже мають. */
export interface ServerTableStore<TSortBy extends string> {
  filters: {
    sortBy: TSortBy | null
    sortDirection: SortDirection | null
    setSort(by: TSortBy | null, dir?: SortDirection): void
  }
  data: { rows: readonly unknown[]; isLoading: boolean; isError: boolean }
}

// Скелетонів більше екрана не треба — далі вони лише миготять.
const MAX_SKELETON_ROWS = 8

export function useServerTable<TId extends string, TSortBy extends string>(
  store: ServerTableStore<TSortBy>,
  columns: ColumnsMap<TId, TSortBy>,
) {
  const sorting = computed<SortingState>({
    get: () => {
      const { sortBy, sortDirection } = store.filters
      if (!sortBy || !sortDirection) return []
      const id = columns.toId[sortBy]
      if (!id) return []
      return [{ id, desc: sortDirection === 'desc' }]
    },
    set: (next) => {
      const first = next[0]
      if (!first) { store.filters.setSort(null); return }
      if (!columns.isId(first.id)) return
      const sortBy = columns.byId[first.id]
      if (!sortBy) return  // несортована колонка (значення в карті null)
      store.filters.setSort(sortBy, first.desc ? 'desc' : 'asc')
    },
  })

  return { sorting, ...useTableStates(store) }
}

/** Одне сортування в стеку мультисортування. */
export interface ServerSortEntry<TSortBy extends string> {
  by: TSortBy
  direction: SortDirection
}

/** Зріз стора для таблиці з мультисортуванням. */
export interface ServerMultiSortStore<TSortBy extends string> {
  filters: {
    sort: ReadonlyArray<ServerSortEntry<TSortBy>>
    setSort(next: Array<ServerSortEntry<TSortBy>>): void
  }
  data: { rows: readonly unknown[]; isLoading: boolean; isError: boolean }
}

/**
 * Те саме, але сортувань кілька і порядок = пріоритет.
 *
 * Міст двосторонній, як і в одиночного: цикл кліку, стек і номери пріоритету
 * веде TanStack. Умова цього — СВІЙ стовпець під кожен ключ; ті, що не мають
 * чого показувати в таблиці (`owner`, «Паливо, частка»), заведені як приховані
 * (`columnVisibility`). Поки таких стовпців не було, стан доводилось віддавати
 * лише на читання й фільтрувати, а номер пріоритету рахувався по обрізаному
 * масиву — і на екрані розходився зі справжнім порядком.
 */
export function useServerMultiSortTable<TId extends string, TSortBy extends string>(
  store: ServerMultiSortStore<TSortBy>,
  columns: ColumnsMap<TId, TSortBy>,
) {
  const sorting = computed<SortingState>({
    get: () => store.filters.sort.flatMap((entry) => {
      const id = columns.toId[entry.by]

      return id === undefined ? [] : [{ id, desc: entry.direction === 'desc' }]
    }),
    set: (next) => {
      store.filters.setSort(next.flatMap((item) => {
        if (!columns.isId(item.id)) return []

        const by = columns.byId[item.id]
        if (!by) return []  // несортована колонка (значення в карті null)

        return [{ by, direction: item.desc ? 'desc' : 'asc' } as ServerSortEntry<TSortBy>]
      }))
    },
  })

  return { sorting, ...useTableStates(store) }
}

/** Стани порожньо/помилка/скелетони — і для таблиць без серверного сортування. */
export function useTableStates(store: {
  data: { rows: readonly unknown[]; isLoading: boolean; isError: boolean }
}) {
  // Перший показ — скелетони; refetch поверх наявних рядків їх не показує.
  const isInitialLoading = computed(() => store.data.isLoading && store.data.rows.length === 0)

  // Впав запит — це НЕ «нічого не знайдено»: порожньо — подивились і не знайшли,
  // помилка — не подивились. Один рядок на обидва брехав би про фільтри.
  const isError = computed(() => store.data.isError && store.data.rows.length === 0)
  const isEmpty = computed(() =>
    !store.data.isLoading && !isError.value && store.data.rows.length === 0,
  )

  const skeletonRowsCount = MAX_SKELETON_ROWS

  return { isInitialLoading, isEmpty, isError, skeletonRowsCount }
}
