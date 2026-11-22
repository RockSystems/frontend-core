// Віртуалізація серверної таблиці з підвантаженням порцій (`useServerInfiniteList`):
// у DOM лише видимі рядки, наступна порція — коли дійшли до кінця завантаженого.
//
// Таблиця рендерить сама: `items` — які рядки малювати, `padTop` / `padBottom` —
// висота розпірок над і під ними (TableVirtualPad), `measure` — на корінь рядка,
// щоб висоту брати справжню, а не оцінку. Ширини колонок тримає тут же (нижче).

import { useVirtualizer } from '@tanstack/vue-virtual'
import { useDebounceFn, useEventListener, useResizeObserver } from '@vueuse/core'
import { computed, nextTick, onMounted, onUnmounted, provide, ref, watch, type Ref } from 'vue'
import { TABLE_WIDTHS_KEY } from '../components/tables/tableCard.context'
import { TableViewState } from '../components/tables/tableView'
import { TableWidthsState } from '../components/tables/tableWidths'

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
/** Звичайний запас рядків над і під видимими. */
const OVERSCAN = 8
/** Запас для першого заміру ширин: з видимими виходить близько 50 рядків. */
const WARM_OVERSCAN = 40
/** Вужче колонку руками не стиснути: лишається місце на «…» і межу. */
const MIN_WIDTH = 40

export function useVirtualTable(options: {
  /** Таблиця; скролиться її батько — область прокрутки UiTableCard. */
  table: Readonly<Ref<HTMLTableElement | null>>
  /** Рядки в порядку показу; ключ — `id`. */
  rows: () => ReadonlyArray<{ id: string }>
  list: InfiniteListStore
  estimateSize?: number
  /**
   * Ключ таблиці для ширин колонок, змінених руками. З ним межі колонок у шапці
   * можна тягнути, а ширини памʼятаються (SharedConfig.columnWidths чи браузер);
   * без нього ширини лише автоматичні.
   */
  widthsKey?: string
}) {
  const { list } = options

  // Запит увімкнений, лише поки таблиця на екрані (див. useServerInfiniteList).
  onMounted(() => list.data.setShown(true))
  onUnmounted(() => list.data.setShown(false))

  // Елемент прокрутки читаємо в самому computed: картка перемальовує таблицю
  // (порожньо → дані), і без перерахунку опцій віртуалізатор слухав би прокрутку
  // вже неіснуючого елемента.
  const scrollEl = computed(() => options.table.value?.parentElement ?? null)
  // Ширини ще не заміряні — малюємо більше рядків, щоб найширші потрапили в перший замір.
  const isWidthsWarm = ref(false)
  const virtualizer = useVirtualizer(computed(() => {
    const element = scrollEl.value
    const rows = options.rows()

    return {
      count: rows.length,
      getScrollElement: () => element,
      estimateSize: () => options.estimateSize ?? DEFAULT_ESTIMATE,
      overscan: isWidthsWarm.value ? OVERSCAN : WARM_OVERSCAN,
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

  // Ширини колонок браузер рахує по намальованих рядках, і прокрутка їх смикала б.
  // Тому підбираємо їх один раз — по ~50 рядках — і заморожуємо (`t--frozen`,
  // table-layout: fixed): далі колонки не рухаються, а довше за ширину
  // обрізається трьома крапками з підказкою. Наново — інша вибірка, вид чи
  // ширина картки.
  function headerCells(): HTMLTableCellElement[] {
    const head = options.table.value?.tHead
    // Шапка з кількох рядків (групи колонок): fixed бере ширини з першого, а там
    // об'єднані комірки — таку не заморожуємо, лишаємо браузеру.
    return head?.rows.length === 1 ? [...head.rows[0].cells] : []
  }

  function unfreezeWidths(): void {
    const table = options.table.value
    table?.classList.remove('t--frozen')
    if (table) table.style.width = ''
    for (const cell of headerCells()) cell.style.width = ''
    isWidthsWarm.value = false
  }

  function freezeWidths(): void {
    const table = options.table.value
    const cells = headerCells()
    if (isWidthsWarm.value || !table || !cells.length || !options.rows().length) return
    // Міряємо, коли запас рядків уже намальований (рядки віртуалізатора несуть
    // data-index): інакше замір пішов би по видимих, і все було б дарма.
    // data-index буває й на самому tbody (рядок із розкриттям — свій tbody):
    // без `tbody[data-index]` такі таблиці не заморожувались зовсім.
    if (table.querySelectorAll('tbody[data-index], tbody [data-index]').length < items.value.length) return

    // Спершу всі заміри, потім усі ширини: інакше кожна записана ширина
    // перераховувала б розкладку для наступного заміру. Підтягнута руками
    // колонка бере свою ширину, решта — заміряну.
    // Дробні, як є: округлені вгору в сумі виходили ширші за картку на кілька
    // пікселів, і прокрутка вбік зʼявлялась навіть там, де все вміщалось.
    const widths = cells.map(cell => cell.getBoundingClientRect().width)
    const own = savedWidths.value
    cells.forEach((cell, index) => {
      cell.style.boxSizing = 'border-box'
      cell.style.width = `${ownWidth(cell, own) ?? widths[index]}px`
    })
    fitTable(own)
    // Висота шапки — плашці «скинути ширину» в куті (UiTableCard): заголовки в
    // один рядок, тож після заморозки вона не змінюється.
    // Дробна, як є: округлена зсувала нижню лінію плашки на пів пікселя від лінії шапки.
    table.parentElement?.style.setProperty('--t-head-h', `${table.tHead?.getBoundingClientRect().height ?? 0}px`)
    table.classList.add('t--frozen')
    table.classList.toggle('t--resizable', options.widthsKey !== undefined)
    isWidthsWarm.value = true
  }

  // Новий перший рядок — інша вибірка; інший вид — інші колонки.
  watch([() => options.rows()[0]?.id, () => TableViewState.current.value], unfreezeWidths)
  watch([items, () => options.rows()[0]?.id, () => TableViewState.current.value], freezeWidths, { flush: 'post' })

  // Картка стала іншої ширини (вікно, масштаб сторінки, бічне меню) — заміряні
  // ширини вже не її: лишились би прокрутка вбік або порожнеча в колонках.
  // Міряємо наново; підтягнуті руками колонки лишаються своїми.
  let cardWidth = 0
  const remeasure = useDebounceFn(() => {
    if (drag || !isWidthsWarm.value) return
    unfreezeWidths()
    void nextTick(freezeWidths)
  }, 150)
  useResizeObserver(scrollEl, ([entry]) => {
    const width = Math.round(entry.contentRect.width)
    if (width === cardWidth) return
    const isFirst = cardWidth === 0
    cardWidth = width
    if (!isFirst) void remeasure()
  })

  // === Ширини руками ========================================================
  // Як в Excel: межа тягне лише свою колонку, решта лишаються своєї ширини й
  // зсуваються. Таблиця тоді шириною в суму колонок: ширша за картку —
  // прокрутка вбік, вужча — порожньо праворуч. Подвійний клік по межі повертає
  // колонці автоматичну ширину.
  const savedWidths = computed(() => (options.widthsKey ? TableWidthsState.get(options.widthsKey) : {}))

  function ownWidth(cell: HTMLTableCellElement, own: Record<string, number>): number | undefined {
    const column = cell.dataset.col
    return column ? own[column] : undefined
  }

  // Жодної своєї ширини — таблиця на всю картку, як без ручних ширин; інакше
  // рівно сума колонок: на 100% браузер розкидав би різницю по всіх колонках.
  // `data-own` — колонки, підтягнуті руками: їх підсвічує наведення на «скинути».
  function fitTable(own: Record<string, number>): void {
    const table = options.table.value
    const cells = headerCells()
    if (!table) return
    for (const cell of cells) cell.toggleAttribute('data-own', ownWidth(cell, own) !== undefined)
    const hasOwn = cells.some(cell => cell.hasAttribute('data-own'))
    table.style.width = hasOwn ? `${cells.reduce((sum, cell) => sum + parseFloat(cell.style.width), 0)}px` : ''
  }

  let drag: {
    handle: Element
    cell: HTMLTableCellElement
    startX: number
    startWidth: number
    tableWidth: number
    isMoved: boolean
  } | null = null

  // Ширини з акаунта приїхали після заміру — кладемо їх поверх заміряних.
  watch(savedWidths, (own) => {
    if (!isWidthsWarm.value || drag) return
    for (const cell of headerCells()) {
      const width = ownWidth(cell, own)
      if (width !== undefined) cell.style.width = `${width}px`
    }
    fitTable(own)
  })

  function handleOf(event: Event): Element | null {
    return event.target instanceof Element ? event.target.closest('.t__resize') : null
  }

  useEventListener(options.table, 'pointerdown', (event: PointerEvent) => {
    const handle = handleOf(event)
    const cell = handle?.closest('th')
    const table = options.table.value
    if (!handle || !table || !options.widthsKey || !isWidthsWarm.value || event.button !== 0) return
    if (!(cell instanceof HTMLTableCellElement) || !cell.dataset.col) return

    event.preventDefault()
    // Усі колонки — рівно як зараз на екрані, таблиця — їхня сума: тоді рух
    // межі змінює лише цю колонку, а не розкладається по сусідах.
    const cells = headerCells()
    const widths = cells.map(item => item.getBoundingClientRect().width)
    cells.forEach((item, index) => { item.style.width = `${widths[index]}px` })
    const tableWidth = widths.reduce((sum, width) => sum + width, 0)
    table.style.width = `${tableWidth}px`

    drag = { handle, cell, startX: event.clientX, startWidth: cell.getBoundingClientRect().width, tableWidth, isMoved: false }
    handle.setPointerCapture(event.pointerId)
    handle.classList.add('is-active')
    document.body.classList.add('t-resizing')
  })

  useEventListener(options.table, 'pointermove', (event: PointerEvent) => {
    const table = options.table.value
    if (!drag || !table) return

    const width = Math.max(drag.startWidth + event.clientX - drag.startX, MIN_WIDTH)
    drag.cell.style.width = `${width}px`
    table.style.width = `${drag.tableWidth + width - drag.startWidth}px`
    drag.isMoved = true
  })

  function endDrag(event: PointerEvent): void {
    if (!drag) return

    const { handle, cell, isMoved } = drag
    drag = null
    if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId)
    handle.classList.remove('is-active')
    document.body.classList.remove('t-resizing')

    // Клік без руху (і перший клік подвійного) ширин не фіксує — таблицю назад.
    const column = cell.dataset.col
    if (!isMoved || !options.widthsKey || !column) {
      fitTable(savedWidths.value)
      return
    }

    TableWidthsState.set(options.widthsKey, { ...savedWidths.value, [column]: Math.round(cell.getBoundingClientRect().width) })
  }

  useEventListener(options.table, 'pointerup', endDrag)
  useEventListener(options.table, 'pointercancel', endDrag)

  function keepWidths(own: Record<string, number>): void {
    if (!options.widthsKey) return
    TableWidthsState.set(options.widthsKey, own)
    // Наново заміряти: автоматична ширина — та, що дає браузер за вмістом.
    unfreezeWidths()
    void nextTick(freezeWidths)
  }

  useEventListener(options.table, 'dblclick', (event: MouseEvent) => {
    const column = handleOf(event)?.closest('th')?.dataset.col
    if (!column) return

    const rest = { ...savedWidths.value }
    delete rest[column]
    keepWidths(rest)
  })

  // Кнопка «скинути ширину» в підвалі UiTableCard. Без `widthsKey` — null: інакше
  // картка всередині такої таблиці взяла б ширини таблиці-предка.
  provide(TABLE_WIDTHS_KEY, options.widthsKey === undefined ? null : {
    hasOwn: computed(() => Object.keys(savedWidths.value).length > 0),
    reset: () => keepWidths({}),
  })

  // Обрізаному — повний текст у підказці, коли навели.
  useEventListener(options.table, 'mouseover', (event: MouseEvent) => {
    const target = event.target instanceof Element ? event.target.closest<HTMLElement>('.t__cell, .t__sub') : null
    if (target && !target.title && target.scrollWidth > target.clientWidth) target.title = target.innerText.trim()
  })

  return { items, padTop, padBottom, measure }
}
