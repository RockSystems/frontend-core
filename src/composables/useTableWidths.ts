// Ширини колонок таблиці — одне правило на всі таблиці: віртуальні (useVirtualTable
// кличе це сам) і звичайні (звіт однією порцією, таблиця в картці).
//
// Ширини браузер рахує по намальованих рядках, і прокрутка чи підвантаження їх
// смикали б. Тому підбираємо їх один раз і заморожуємо (`t--frozen`,
// table-layout: fixed): далі колонки не рухаються, а довше за ширину обрізається
// «…» з підказкою, клік по обрізаному відкриває весь текст. Наново — інша
// вибірка, вид чи ширина картки.
//
// Міряємо все в один рядок (`t--measuring`): саме так таблиця й показує. Колишній
// замір із переносом давав колонці ширину перенесеного тексту, а показ в один
// рядок його різав. Далі ширину ділимо за видом колонки (meta.kind): значення й
// кнопки — за вмістом, вільне місце — текстовим колонкам; без них — значенням.
// Не влазить і в мінімум — прокрутка вбік, значення лишаються цілими.

import { useDebounceFn, useEventListener, useResizeObserver } from '@vueuse/core'
import { computed, nextTick, provide, ref, watch, type Ref } from 'vue'
import { TABLE_WIDTHS_KEY } from '../components/tables/tableCard.context'
import { columnTitleOf, TableTextState } from '../components/tables/tableText'
import { TableViewState } from '../components/tables/tableView'
import { TableWidthsState } from '../components/tables/tableWidths'
import { SharedConfig } from '../config'

/** Вужче колонку руками не стиснути: лишається місце на «…» і межу. */
const MIN_WIDTH = 40
/** Текстова колонка не вужча за це (і за свій заголовок), коли місця бракує. */
const TEXT_MIN_WIDTH = 160
/** Підказка обрізаної комірки — не довша: решту видно у вікні по кліку. */
const TITLE_MAX = 300

/**
 * Розподілити `spare` між колонками `indexes`: кожна має щонайменше `mins[i]`;
 * далі — дорощуємо до природної ширини, а що лишилось — пропорційно їй.
 */
function distribute(widths: number[], indexes: number[], natural: number[], mins: number[], spare: number): void {
  let rest = spare - indexes.reduce((sum, index) => sum + mins[index], 0)
  for (const index of indexes) widths[index] = mins[index]
  const growth = indexes.map(index => Math.max(natural[index] - mins[index], 0))
  const growthSum = growth.reduce((sum, value) => sum + value, 0)
  const toNatural = Math.min(rest, growthSum)
  indexes.forEach((index, position) => {
    if (growthSum > 0) widths[index] += toNatural * growth[position] / growthSum
  })
  rest -= toNatural
  const naturalSum = indexes.reduce((sum, index) => sum + natural[index], 0)
  if (rest <= 0 || naturalSum <= 0) return
  for (const index of indexes) widths[index] += rest * natural[index] / naturalSum
}

/** Обрізане: не влазить ні в ширину (один рядок), ні у висоту (три рядки переносу). */
function isCut(element: HTMLElement): boolean {
  return element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1
}

export function useTableWidths(options: {
  /** Таблиця; скролиться її батько — область прокрутки UiTableCard чи картки. */
  table: Readonly<Ref<HTMLTableElement | null>>
  /** Рядки в порядку показу: інший перший рядок — інша вибірка, міряємо наново. */
  rows: () => ReadonlyArray<{ id: string }>
  /**
   * Ключ таблиці для ширин колонок, змінених руками. З ним межі колонок у шапці
   * можна тягнути, а ширини памʼятаються (SharedConfig.columnWidths чи браузер);
   * без нього ширини лише автоматичні.
   */
  widthsKey?: string
  /** Чи вже намальовано все, по чому міряти (віртуальна — запас рядків). Без нього — так. */
  isReady?: () => boolean
  /** Що ще має перезапускати спробу заміру (віртуальна — намальовані рядки). */
  trigger?: () => unknown
}) {
  const scrollEl = computed(() => options.table.value?.parentElement ?? null)
  const isFrozen = ref(false)

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
    isFrozen.value = false
  }

  /** Ширина самого заголовка з відступами: менше текстовій колонці не дати — він завжди цілий. */
  function headerWidth(cell: HTMLTableCellElement): number {
    const label = cell.firstElementChild
    if (!(label instanceof HTMLElement)) return cell.getBoundingClientRect().width
    const style = getComputedStyle(cell)
    return label.getBoundingClientRect().width + parseFloat(style.paddingLeft) + parseFloat(style.paddingRight)
  }

  /** Ширини колонок за видом: див. шапку файлу. */
  function planWidths(
    cells: HTMLTableCellElement[],
    natural: number[],
    headers: number[],
    own: Record<string, number>,
  ): number[] {
    const widths = natural.slice()
    const flexible: number[] = []
    const texts: number[] = []
    cells.forEach((cell, index) => {
      const width = ownWidth(cell, own)
      if (width !== undefined) widths[index] = width
      else if (cell.dataset.kind === 'text') texts.push(index)
      else if (cell.dataset.kind !== 'actions') flexible.push(index)
    })

    // Без відступів: таблиця в картці (не в області прокрутки) стоїть усередині них.
    const parent = scrollEl.value
    const padding = parent ? parseFloat(getComputedStyle(parent).paddingLeft) + parseFloat(getComputedStyle(parent).paddingRight) : 0
    const available = (parent?.clientWidth ?? 0) - padding
    const fixed = (indexes: number[]) => widths.reduce((sum, width, index) => (indexes.includes(index) ? sum : sum + width), 0)

    if (texts.length) {
      // Бажаний мінімум — до TEXT_MIN_WIDTH (коротший текст — своя ширина); межа —
      // заголовок: він завжди цілий.
      const mins = natural.slice()
      const floors = natural.slice()
      for (const index of texts) {
        floors[index] = Math.min(natural[index], headers[index])
        mins[index] = Math.max(floors[index], Math.min(natural[index], TEXT_MIN_WIDTH))
      }
      const spare = available - fixed(texts)
      const sumOf = (values: number[]) => texts.reduce((sum, index) => sum + values[index], 0)
      if (spare > sumOf(mins)) {
        distribute(widths, texts, natural, mins, spare)
      } else if (spare > sumOf(floors)) {
        // Трохи не влазить — текстові стискаються між межею й мінімумом, без прокрутки вбік.
        const share = (spare - sumOf(floors)) / (sumOf(mins) - sumOf(floors) || 1)
        for (const index of texts) widths[index] = floors[index] + (mins[index] - floors[index]) * share
      } else {
        // Не влазить і так — текстові по заголовку, решта прокручується вбік.
        for (const index of texts) widths[index] = floors[index]
      }
      return widths
    }

    // Текстових немає — зайве місце значенням, кнопки лишаються за вмістом справа.
    const spare = available - fixed(flexible)
    const naturalSum = flexible.reduce((sum, index) => sum + natural[index], 0)
    if (flexible.length && spare > naturalSum) distribute(widths, flexible, natural, natural, spare)
    return widths
  }

  function freezeWidths(): void {
    const table = options.table.value
    const cells = headerCells()
    if (isFrozen.value || !table || !cells.length || !options.rows().length) return
    if (options.isReady && !options.isReady()) return

    // Спершу всі заміри, потім усі ширини: інакше кожна записана ширина
    // перераховувала б розкладку для наступного заміру. Підтягнута руками
    // колонка бере свою ширину, решта — за видом.
    // Дробні, як є: округлені вгору в сумі виходили ширші за картку на кілька
    // пікселів, і прокрутка вбік зʼявлялась навіть там, де все вміщалось.
    table.classList.add('t--measuring')
    const natural = cells.map(cell => cell.getBoundingClientRect().width)
    const headers = cells.map(headerWidth)
    table.classList.remove('t--measuring')
    const widths = planWidths(cells, natural, headers, savedWidths.value)
    cells.forEach((cell, index) => {
      cell.style.boxSizing = 'border-box'
      cell.style.width = `${widths[index]}px`
    })
    fitTable(savedWidths.value)
    // Висота шапки — плашці «скинути ширину» в куті (UiTableCard): заголовки в
    // один рядок, тож після заморозки вона не змінюється.
    // Дробна, як є: округлена зсувала нижню лінію плашки на пів пікселя від лінії шапки.
    table.parentElement?.style.setProperty('--t-head-h', `${table.tHead?.getBoundingClientRect().height ?? 0}px`)
    table.classList.add('t--frozen')
    table.classList.toggle('t--resizable', options.widthsKey !== undefined)
    isFrozen.value = true
  }

  // Новий перший рядок — інша вибірка; інший вид — інші колонки.
  const firstRow = () => options.rows()[0]?.id
  watch([firstRow, () => TableViewState.current.value], unfreezeWidths)
  watch(
    [options.table, firstRow, () => options.rows().length, () => TableViewState.current.value, () => options.trigger?.()],
    freezeWidths,
    { flush: 'post' },
  )

  // Картка стала іншої ширини (вікно, масштаб сторінки, бічне меню) — заміряні
  // ширини вже не її: лишились би прокрутка вбік або порожнеча в колонках.
  // Міряємо наново; підтягнуті руками колонки лишаються своїми.
  let cardWidth = 0
  const remeasure = useDebounceFn(() => {
    if (drag || !isFrozen.value) return
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

  // Таблиця — рівно сума колонок: на 100% браузер розкидав би різницю по всіх
  // колонках, зокрема й по кнопках. Без ручних ширин сума й так дорівнює картці
  // (planWidths ділить саме її), а не влізло — ширша, з прокруткою вбік.
  // `data-own` — колонки, підтягнуті руками: їх підсвічує наведення на «скинути».
  function fitTable(own: Record<string, number>): void {
    const table = options.table.value
    const cells = headerCells()
    if (!table) return
    for (const cell of cells) cell.toggleAttribute('data-own', ownWidth(cell, own) !== undefined)
    table.style.width = `${cells.reduce((sum, cell) => sum + parseFloat(cell.style.width), 0)}px`
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
    if (!isFrozen.value || drag) return
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
    if (!handle || !table || !options.widthsKey || !isFrozen.value || event.button !== 0) return
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

  // Обрізаному — початок тексту в підказці й курсор-рука: клік відкриває весь.
  const showFullHint = SharedConfig.get().labels.tableShowFull
  useEventListener(options.table, 'mouseover', (event: MouseEvent) => {
    const target = event.target instanceof Element ? event.target.closest<HTMLElement>('.t__cell, .t__sub') : null
    if (!target || target.title || !isCut(target)) return
    const text = target.innerText.trim()
    const start = text.length > TITLE_MAX ? `${text.slice(0, TITLE_MAX)}…` : text
    target.title = showFullHint ? `${start}\n\n${showFullHint}` : start
    target.classList.add('is-cut')
  })

  // Клік по обрізаному — вікно з повним текстом. Ловимо раніше за рядок (capture)
  // і далі не пускаємо: клік по рядку відкриває картку, а тут хотіли прочитати.
  // Посилання й кнопки в комірці працюють як завжди.
  useEventListener(options.table, 'click', (event: MouseEvent) => {
    const target = event.target instanceof Element ? event.target : null
    const cell = target?.closest<HTMLElement>('.t__cell, .t__sub')
    if (!cell || !isCut(cell) || target?.closest('a, button, input, select, textarea, label')) return
    event.stopPropagation()
    TableTextState.open({ title: columnTitleOf(cell), text: cell.innerText.trim() })
  }, { capture: true })

  return { isFrozen }
}
