// Вид таблиць із другими рядками колонок — один вибір на всі таблиці.
// Ядро саме памʼятає його в браузері, тож кнопка працює без підключення.
// Сховище проєкту (акаунт) головне, браузер — поки воно не прийшло.

import type {} from '../../types/table'
import type { Column } from '@tanstack/vue-table'
import { computed, ref } from 'vue'
import { SharedConfig, type TableView } from '../../config'

const STORAGE_KEY = 'frontend-core:table-view'

function isTableView(value: unknown): value is TableView {
  return value === 'wide' || value === 'stacked'
}

function readStored(): TableView | null {
  try {
    const value = globalThis.localStorage?.getItem(STORAGE_KEY)
    return isTableView(value) ? value : null
  } catch {
    // Приватне вікно чи заборонене сховище: діє вид за замовчуванням.
    return null
  }
}

const stored = ref<TableView | null>(readStored())

// Лінива: конфіг читається при першому зверненні, а не при імпорті модуля.
const current = computed<TableView>(() => SharedConfig.get().tableView?.get() ?? stored.value ?? 'wide')
const isWide = computed(() => current.value === 'wide')

/** Скільки комірок рядка займає колонка: у розгорнутому виді другий рядок — ще одна. */
function span(column: Column<any, unknown>): number {
  return isWide.value && column.columnDef.meta?.sub ? 2 : 1
}

export const TableViewState = {
  /** Поточний вид; за замовчуванням — розгорнутий. */
  current,
  isWide,
  span,
  /** Комірок у рядку — для colspan розпірок і рядків на всю ширину таблиці. */
  cellCount: (columns: readonly Column<any, unknown>[]): number =>
    columns.reduce((sum, column) => sum + span(column), 0),

  set(view: TableView): void {
    stored.value = view
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, view)
    } catch {
      // Не записалось — вибір живе до перезавантаження сторінки.
    }
    SharedConfig.get().tableView?.set(view)
  },

  toggle(): void {
    TableViewState.set(current.value === 'wide' ? 'stacked' : 'wide')
  },
}
