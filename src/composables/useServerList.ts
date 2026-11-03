// Стор серверного списку з однієї схеми адреси: фільтри, сеттери, синк з
// адресою, запит порціями при прокрутці й помилки.
//
// Чому так: дванадцять сторів списків були однією схемою, переписаною руками.
// Кожен фільтр стояв у сторі тричі — ref, рядок у syncUrl і сеттер у
// неймспейсі `filters`, — і забутий рядок у syncUrl тихо губив фільтр після
// перезавантаження, а типи цього не ловили. Тут поля, ref'и й сеттери
// виводяться зі схеми адреси (UrlSchemaHelper), тож розійтися нічому.
//
// Що лишається фічі — те, що справді її: як стан лягає в параметри запиту
// (`params`) і яку фабрику запиту кликати (`query`, з `api/<feature>/*.queries.ts`).
//
// Імена — ті самі, що вже читають компоненти:
// • поле `types` → `filters.types` + `filters.setTypes`;
// • булеве `isLeasing` → `filters.isLeasing` + `filters.setLeasing`;
// • текст із дебаунсом (`debounced`) → `filters.searchDraft` (пише UI) +
//   `filters.setSearch`, а в запит іде відставлений `filters.search`;
// • пара `sortBy` / `sortDirection` → `filters.setSort(by, dir)` (useServerTable);
// • пара `managerIds` / `isWithoutManager` взаємовиключна (useManagerFilter).

import {
  useInfiniteQuery,
  type DataTag,
  type InfiniteData,
  type QueryKey,
  type UseInfiniteQueryOptions,
} from '@tanstack/vue-query'
import { computed, ref, toValue, watch, type MaybeRefOrGetter, type Ref } from 'vue'
import { useDebouncedFilter, useManagerFilter, useSortState } from './useFilterState'
import { useHandleError } from '../errors/useHandleError'
import type { SortDirection } from './useServerTable'

/** Поля схеми, якими керує сам список, а не фільтри. */
type Reserved = 'page'

type StripIs<K extends string> = K extends `is${infer Rest}` ? Rest : K
type SetterName<K extends string> = `set${Capitalize<StripIs<K>>}`

type FilterKeys<TState> = Exclude<keyof TState & string, Reserved>

/** Поле з `defaults` після читання адреси вже не порожнє — і тип це знає. */
type WithDefaults<TState, TDefaults extends keyof TState> = {
  [K in keyof TState]: K extends TDefaults ? NonNullable<TState[K]> : TState[K]
}

/** Рядок списку з відповіді виду `{ data: Row[] }`. */
type RowOf<TResponse> = TResponse extends { data: ReadonlyArray<infer TRow> } ? TRow : unknown
type TextKeys<TState> = { [K in FilterKeys<TState>]: TState[K] extends string ? K : never }[FilterKeys<TState>]

/** Те, що потрібно кнопці «Скинути фільтри» (FiltersBar, порожня таблиця). */
export interface ResettableFilters {
  /** Хоч один фільтр відрізняється від чистої адреси. */
  isFiltered: boolean
  reset(): void
}

/** Неймспейс `store.filters`: значення, чернетки текстових полів і сеттери. */
export type ListFilters<TState, TDebounced extends TextKeys<TState>> =
  & { isFiltered: Ref<boolean>; reset(): void }
  & { [K in FilterKeys<TState>]: Ref<TState[K]> }
  & { [K in TDebounced as `${K}Draft`]: Ref<string> }
  & { [K in FilterKeys<TState> as SetterName<K>]: (next: TState[K]) => void }
  & (TState extends { sortBy: infer TSortBy; sortDirection: SortDirection | null }
    ? { setSort(by: TSortBy, dir?: SortDirection | null): void }
    : unknown)

/** Фільтри ↔ адреса списку. */
export interface ListStateConfig<
  TState,
  TParams,
  TDebounced extends TextKeys<TState>,
  TDefaults extends FilterKeys<TState>,
> {
  /** Схема адреси фічі (`UrlSchemaHelper.create`): з неї — поля, ref'и й сеттери. */
  url: { read: () => TState; write: (state: TState) => void; blank: () => TState }
  /** Поля стану, що не фільтри (вкладка, вид подання): «Скинути фільтри» їх лишає. */
  keep?: readonly FilterKeys<TState>[]
  /** Значення поля, коли в адресі його немає (період за замовчуванням тощо). */
  defaults?: { [K in TDefaults]: () => NonNullable<TState[K]> }
  /** Текстові поля з дебаунсом: UI пише чернетку, у запит іде відставлене. */
  debounced?: readonly TDebounced[]
  /** Як стан лягає в параметри запиту — імена й формат бека. */
  params: (state: Omit<WithDefaults<TState, TDefaults>, Reserved>) => TParams
  /** Правка стану, прочитаного з адреси: недопустиме значення замінюємо, а не шлемо на бек. */
  fromUrl?: (state: TState) => TState
  /** Правка стану перед записом в адресу: поле, що зараз нічого не значить, не тримаємо. */
  toUrl?: (state: TState) => TState
}

/** Опції нескінченної фабрики (`infiniteQueryOptions`): порції — сторінки бека. */
/** Решту (initialPageParam, getNextPageParam) задає фабрика — тут лише тип відповіді в ключі. */
type InfiniteListQueryOptions<TResponse> = { queryKey: DataTag<QueryKey, InfiniteData<TResponse, unknown>, unknown> }

/** Як дістати рядки з порції — без адреси й фільтрів. */
export interface InfiniteRowsConfig<TParams, TResponse, TRow> {
  /** Нескінченна фабрика з `api/<feature>/*.queries.ts` (`DriversQueries.list`). */
  query: (params: TParams) => InfiniteListQueryOptions<TResponse>
  enabled?: MaybeRefOrGetter<boolean>
  /** Рядки порції; за замовчуванням `response.data`. */
  rows?: (response: TResponse) => readonly TRow[] | undefined
  /** Ключ рядка для зведення порцій; за замовчуванням `row.id`, без нього — обовʼязковий. */
  rowId?: (row: TRow) => string
  /** Скільки всього за фільтром; за замовчуванням `response.meta.total` або `response.total`. */
  total?: (response: TResponse) => number
}

export interface ServerInfiniteListConfig<
  TState,
  TParams,
  TResponse,
  TRow,
  TDebounced extends TextKeys<TState>,
  TDefaults extends FilterKeys<TState>,
> extends ListStateConfig<TState, TParams, TDebounced, TDefaults>, InfiniteRowsConfig<TParams, TResponse, TRow> {}

/**
 * Список з підвантаженням порцій при прокрутці — для віртуалізованих таблиць.
 * Фільтри й адреса ті самі, що в `useServerList`, тільки сторінки в адресі немає:
 * нова вибірка завжди починається з першої порції.
 */
export function useServerInfiniteList<
  TState extends Record<string, unknown> & { page: number },
  TParams extends object,
  TResponse,
  TRow = RowOf<TResponse>,
  TDebounced extends TextKeys<TState> = never,
  TDefaults extends FilterKeys<TState> = never,
>(config: ServerInfiniteListConfig<TState, TParams, TResponse, TRow, TDebounced, TDefaults>) {
  const { filters, state, params } = useListState(config)

  // Сторінки в адресі немає: посилання завжди відкриває список з початку.
  function syncUrl(): void {
    const next = { ...state.value, page: 1 } as unknown as TState
    config.url.write(config.toUrl ? config.toUrl(next) : next)
  }

  watch(state, syncUrl, { deep: true })

  const { data, query } = useInfiniteRows(config, params)

  return { filters, data, syncUrl, state, params, query }
}

/**
 * Порції без адреси: для списку, що живе не на своїй сторінці (вкладки картки
 * водія), і як ядро `useServerInfiniteList`.
 *
 * Між порціями хтось міг додати чи прибрати рядок, і зсув сторінок повторив би
 * рядок — тому зводимо порції за id.
 */
export function useInfiniteRows<TParams, TResponse, TRow = RowOf<TResponse>>(
  config: InfiniteRowsConfig<TParams, TResponse, TRow>,
  params: Readonly<Ref<TParams>>,
) {
  const { handleError } = useHandleError()

  // Стор Pinia живе довше за сторінку: без цього запит лишався б «активним» і в
  // картці водія, і кожна зміна там перезапитувала б усі прогорнуті порції у фоні.
  // Вимкнений — неактивний: інвалідація лише позначає його й обрізає до першої порції.
  const isShown = ref(false)

  const query = useInfiniteQuery(() => ({
    ...config.query(params.value),
    enabled: isShown.value && toValue(config.enabled) !== false,
  }) as unknown as UseInfiniteQueryOptions<TResponse, Error, InfiniteData<TResponse, unknown>, QueryKey, unknown>)

  watch(query.error, (error) => { if (error) handleError(error) })

  const rowsOf = (response: TResponse): readonly TRow[] =>
    (config.rows ? config.rows(response) : (response as { data?: readonly TRow[] }).data) ?? []

  // «Без id — rowId обовʼязковий» умовним типом не виразити: TS тоді губить вивід
  // відповіді з лямбди-фабрики. Тож перевірка тут, і гучна: тихо злиті в один
  // рядок порції виглядали б як «дані зникли». Числовий id (автоінкремент) — теж id.
  const idOf = (row: TRow): string => {
    const id = config.rowId ? config.rowId(row) : (row as { id?: unknown }).id
    if (typeof id === 'number' && Number.isFinite(id)) return String(id)
    if (typeof id !== 'string') throw new Error('useInfiniteRows: row has no id, pass rowId')
    return id
  }

  const rows = computed<TRow[]>(() => {
    const seen = new Set<string>()

    return (query.data.value?.pages ?? []).flatMap(rowsOf).filter((row) => {
      const id = idOf(row)
      if (seen.has(id)) return false
      seen.add(id)
      return true
    })
  })

  const first = computed(() => query.data.value?.pages[0])

  const data = {
    rows,
    /** Скільки всього за фільтром; null — перша порція ще не приїхала. */
    total: computed<number | null>(() => {
      const response = first.value
      if (response === undefined) return null
      if (config.total) return config.total(response)

      // `meta.total` — сторінка `Paged`; `total` у корені — списки, що розгортають її в API-шарі.
      const page = response as { meta?: { total: number }; total?: number }

      return page.meta?.total ?? page.total ?? 0
    }),
    isLoading: query.isFetching,
    isLoadingMore: query.isFetchingNextPage,
    hasMore: query.hasNextPage,
    isError: query.isError,
    /** Наступна порція, якщо є і жоден запит зараз не йде (посеред іншого її проігнорують). */
    loadMore: (): void => {
      if (query.hasNextPage.value && !query.isFetching.value) void query.fetchNextPage()
    },
    /** Таблиця на екрані чи ні: кличе її onMounted / onUnmounted. */
    setShown: (next: boolean): void => { isShown.value = next },
    /** «Повторити» в картці таблиці після помилки. */
    refetch: (): void => { void query.refetch() },
  }

  return { data, query }
}

/**
 * Фільтри зі схеми адреси: ref'и, чернетки, сеттери, «Скинути фільтри» і знімок
 * стану з параметрами запиту.
 */
function useListState<
  TState extends Record<string, unknown> & { page: number },
  TParams extends object,
  TDebounced extends TextKeys<TState>,
  TDefaults extends FilterKeys<TState>,
>(config: ListStateConfig<TState, TParams, TDebounced, TDefaults>) {
  const initial = config.fromUrl ? config.fromUrl(config.url.read()) : config.url.read()
  const debounced = new Set<string>(config.debounced ?? [])

  // === стан фільтрів зі схеми =============================================
  const values: Record<string, Ref<unknown>> = {}
  const drafts: Record<string, Ref<string>> = {}
  const setters: Record<string, (next: never) => void> = {}

  const fields = Object.keys(initial).filter(key => key !== 'page' && key !== 'sortBy' && key !== 'sortDirection')
  const hasManagers = 'managerIds' in initial && 'isWithoutManager' in initial

  for (const field of fields) {
    if (hasManagers && (field === 'managerIds' || field === 'isWithoutManager')) continue

    const fallback = (config.defaults as Record<string, (() => unknown) | undefined> | undefined)?.[field]
    const start = initial[field] ?? fallback?.() ?? initial[field]
    const setterName = `set${capitalize(stripIs(field))}`

    if (debounced.has(field)) {
      const { committed, draft } = useDebouncedFilter(String(start ?? ''))
      values[field] = committed
      drafts[`${field}Draft`] = draft
      setters[setterName] = (next: never) => { draft.value = next }

      continue
    }

    const value = ref(start)
    values[field] = value
    setters[setterName] = (next: never) => { value.value = next }
  }

  if (hasManagers) {
    const managers = useManagerFilter(initial.managerIds as string[], initial.isWithoutManager as boolean)
    values.managerIds = managers.managerIds
    values.isWithoutManager = managers.isWithoutManager
    setters.setManagerIds = managers.setManagerIds as (next: never) => void
    setters.setWithoutManager = managers.setWithoutManager as (next: never) => void
  }

  if ('sortBy' in initial && 'sortDirection' in initial) {
    const sort = useSortState(initial.sortBy as string | null, initial.sortDirection as SortDirection | null)
    values.sortBy = sort.sortBy
    values.sortDirection = sort.sortDirection
    setters.setSort = sort.setSort as (next: never) => void
  }

  // === «Скинути фільтри» ===================================================
  // Чистий стан — те, що дало б перше відкриття без параметрів: схема з
  // порожньої адреси, правка fromUrl і дефолти. Скидаємо на місці, без
  // перезавантаження: сортування й вкладка (`keep`) лишаються, де були.
  const blank = config.fromUrl ? config.fromUrl(config.url.blank()) : config.url.blank()
  const kept = new Set<string>([...SORT_FIELDS, ...(config.keep ?? [])])
  const resettable = Object.keys(values).filter(field => !kept.has(field))
  const clean: Record<string, unknown> = {}
  for (const field of resettable) {
    const fallback = (config.defaults as Record<string, (() => unknown) | undefined> | undefined)?.[field]
    clean[field] = blank[field] ?? fallback?.() ?? blank[field]
  }

  // Через toUrl: поле, яке зараз нічого не значить (період у черзі звірки), не
  // має вмикати кнопку, якої не видно за що натискати.
  const isFiltered = computed(() => {
    const shown = (next: Record<string, unknown>) =>
      (config.toUrl ? config.toUrl({ ...next, page: 1 } as unknown as TState) : next) as Record<string, unknown>
    const now = shown(state.value)
    const base = shown({ ...state.value, ...clean })

    return resettable.some(field => comparable(now[field]) !== comparable(base[field]))
  })

  function reset(): void {
    for (const field of resettable) {
      const next = structuredClone(clean[field])
      // Чернетку теж: інакше дебаунс за пів секунди повернув би старий пошук.
      const draft = drafts[`${field}Draft`]
      if (draft) draft.value = next as string
      values[field].value = next
    }
  }

  /** Знімок відставлених значень — те, що йде в запит і в адресу. */
  const state = computed(() => {
    const snapshot: Record<string, unknown> = {}
    for (const [field, value] of Object.entries(values)) snapshot[field] = value.value
    return snapshot as Omit<WithDefaults<TState, TDefaults>, Reserved>
  })

  const params = computed(() => config.params(state.value))

  const filters = { ...values, ...drafts, ...setters, isFiltered, reset } as unknown as ListFilters<WithDefaults<TState, TDefaults>, TDebounced>

  return { initial, filters, state, params }
}

/** Сортування — не фільтр: скидання його не чіпає. */
const SORT_FIELDS = ['sortBy', 'sortDirection', 'sort'] as const

/** Рядок для порівняння зі станом: порядок вибраних опцій і ключів не важить. */
function comparable(value: unknown): string {
  if (Array.isArray(value)) return JSON.stringify(value.map(item => comparable(item)).sort())
  if (value !== null && typeof value === 'object') {
    return JSON.stringify(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)))
  }

  return JSON.stringify(value ?? null)
}

function stripIs(field: string): string {
  return /^is[A-Z]/.test(field) ? field.slice(2) : field
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
