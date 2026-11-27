// Повний вміст обрізаної комірки: клік по ній (useVirtualTable) чи по «ще N» плашок
// (TableChips) кладе його сюди, а TableTextDialog у GlobalModals показує. Модалки
// проєкту таблиця не знає — тому окремий спільний стан, як TableViewState.

import { shallowRef } from 'vue'

export interface TableTextView {
  /** Назва колонки. */
  title: string
  /** Текст комірки. */
  text?: string
  /** Або сам вміст (плашки): у вікно йде його копія. */
  node?: Element
}

const current = shallowRef<TableTextView | null>(null)

/** Назва колонки комірки — заголовок вікна: та сама позиція в першому рядку шапки. */
export function columnTitleOf(element: Element): string {
  const cell = element.closest('td')
  const table = cell?.closest('table')
  const head = table?.tHead?.rows[0]?.cells[cell?.cellIndex ?? -1]
  return head?.querySelector('span')?.firstChild?.textContent?.trim() || head?.textContent?.trim() || ''
}

export const TableTextState = {
  current,
  open(view: TableTextView): void {
    current.value = view
  },
  close(): void {
    current.value = null
  },
}
