// Віртуалізація серверної таблиці з підвантаженням порцій (`useServerInfiniteList`):
// у DOM лише видимі рядки, наступна порція — коли дійшли до кінця завантаженого.
//
// Таблиця рендерить сама: `items` — які рядки малювати, `padTop` / `padBottom` —
// висота розпірок над і під ними (TableVirtualPad), `measure` — на корінь рядка,
// щоб висоту брати справжню, а не оцінку.

import { useVirtualizer } from '@tanstack/vue-virtual'
import { computed, onMounted, onUnmounted, watch, type Ref } from 'vue'

/** Те, що потрібно від стора нескінченного списку. */
export interface InfiniteListStore {
  data: { isLoading: boolean; loadMore(): void; setShown(isShown: boolean): void }
  /** Параметри вибірки: інші — прокрутка на початок. */
  params: unknown
}

/** Висота рядка до виміру — середня; точну дає measure. */
const DEFAULT_ESTIMATE = 64
/** За скільки рядків до кінця просимо наступну порцію: щоб не впиратися в порожнечу. */
const PREFETCH_ROWS = 30

export function useVirtualTable(options: {
  /** Таблиця; скролиться її батько — область прокрутки UiTableCard. */
  table: Readonly<Ref<HTMLTableElement | null>>
  /** Рядки в порядку показу; ключ — `id`. */
  rows: () => ReadonlyArray<{ id: string }>
  list: InfiniteListStore
  estimateSize?: number
}) {
  const { list } = options

  // Запит увімкнений, лише поки таблиця на екрані (див. useServerInfiniteList).
  onMounted(() => list.data.setShown(true))
  onUnmounted(() => list.data.setShown(false))

  // Елемент прокрутки читаємо в самому computed: картка перемальовує таблицю
  // (порожньо → дані), і без перерахунку опцій віртуалізатор слухав би прокрутку
  // вже неіснуючого елемента.
  const scrollEl = computed(() => options.table.value?.parentElement ?? null)
  const virtualizer = useVirtualizer(computed(() => {
    const element = scrollEl.value
    const rows = options.rows()

    return {
      count: rows.length,
      getScrollElement: () => element,
      estimateSize: () => options.estimateSize ?? DEFAULT_ESTIMATE,
      overscan: 8,
      getItemKey: (index: number) => rows[index]?.id ?? index,
    }
  }))

  const items = computed(() => virtualizer.value.getVirtualItems())
  const padTop = computed(() => items.value[0]?.start ?? 0)
  const padBottom = computed(() => {
    const last = items.value.at(-1)
    return last ? virtualizer.value.getTotalSize() - last.end : 0
  })

  /** На корінь рядка (`:ref`): компонент чи елемент — висоту беремо справжню. */
  function measure(target: unknown): void {
    const node = target instanceof Element ? target : (target as { $el?: unknown } | null)?.$el
    if (node instanceof Element) virtualizer.value.measureElement(node)
  }

  // Дійшли до кінця завантаженого — наступна порція. І коли закінчився запит:
  // просьба посеред іншого ігнорується, а індекс уже не зміниться — список застряг би.
  watch([() => items.value.at(-1)?.index, () => list.data.isLoading], ([lastIndex, isLoading]) => {
    if (!isLoading && lastIndex !== undefined && lastIndex >= options.rows().length - PREFETCH_ROWS) list.data.loadMore()
  })

  // Інша вибірка (фільтр, пошук, сортування) — з першого рядка, а не з місця в старій.
  watch(() => list.params, () => virtualizer.value.scrollToOffset(0), { deep: true })

  return { items, padTop, padBottom, measure }
}
