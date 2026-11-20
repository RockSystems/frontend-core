// Ширини колонок, які користувач підтягнув руками, — по ключу таблиці.
// Як і вид таблиць: ядро саме памʼятає їх у браузері, а сховище проєкту
// (акаунт), коли воно є й уже прийшло, головне.

import { reactive } from 'vue'
import { SharedConfig, type ColumnWidths } from '../../config'

const STORAGE_PREFIX = 'frontend-core:column-widths:'

function isWidths(value: unknown): value is ColumnWidths {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    && Object.values(value).every(width => typeof width === 'number' && Number.isFinite(width))
}

function readStored(tableKey: string): ColumnWidths | null {
  try {
    const value: unknown = JSON.parse(globalThis.localStorage?.getItem(STORAGE_PREFIX + tableKey) ?? 'null')
    return isWidths(value) ? value : null
  } catch {
    // Приватне вікно, заборонене сховище чи зіпсований запис: ширини автоматичні.
    return null
  }
}

// Браузерні — в памʼяті, щоб читання не ходило в localStorage на кожен рендер.
const stored = reactive(new Map<string, ColumnWidths>())

export const TableWidthsState = {
  /** Ручні ширини таблиці; порожньо — усі колонки автоматичні. */
  get(tableKey: string): ColumnWidths {
    const own = SharedConfig.get().columnWidths?.get(tableKey)
    if (own) return own

    if (!stored.has(tableKey)) stored.set(tableKey, readStored(tableKey) ?? {})

    return stored.get(tableKey) ?? {}
  },

  set(tableKey: string, widths: ColumnWidths): void {
    stored.set(tableKey, widths)
    try {
      globalThis.localStorage?.setItem(STORAGE_PREFIX + tableKey, JSON.stringify(widths))
    } catch {
      // Не записалось — ширини живуть до перезавантаження сторінки.
    }
    SharedConfig.get().columnWidths?.set(tableKey, widths)
  },
}
