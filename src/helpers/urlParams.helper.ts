// Розбір типових query-параметрів фільтрів: період, сторінка, значення зі
// словника. URL править хто завгодно, тому все, що не пройшло перевірку,
// стає дефолтом, а не летить на бек як є.
//
// Живе в `shared`, а не поруч з UrlStateHelper у `_shared`: той шар спільний
// з іншими проєктами і його склад визначаємо не ми.

import type { UrlReader } from './urlState.helper'
import type { SortDirection } from '../composables/useServerTable'

export interface UrlPeriod {
  from: string
  to: string
}

export class UrlParamsHelper {
  private static readonly ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
  private static readonly SORT_DIRECTIONS: readonly SortDirection[] = ['asc', 'desc']
  // Crockford base32 без I/L/O/U — саме такі id роздає бек.
  private static readonly ULID = /^[0-9A-HJKMNP-TV-Z]{26}$/i

  /** ?from=&to= — період лише якщо обидві дати валідні: половина діапазону сенсу не має. */
  static period(params: UrlReader, fromKey = 'from', toKey = 'to'): UrlPeriod | null {
    const from = params.get(fromKey)
    const to = params.get(toKey)
    if (!from || !to) return null
    if (!UrlParamsHelper.ISO_DATE.test(from) || !UrlParamsHelper.ISO_DATE.test(to)) return null
    return { from, to }
  }

  /** Одиночна дата ?sort_week=2026-07-27. Сміття відкидаємо — бек дав би 422. */
  static isoDate(raw: string | null): string | null {
    return raw && UrlParamsHelper.ISO_DATE.test(raw) ? raw : null
  }

  /** Значення з білого списку, інакше null. */
  static oneOf<T extends string>(raw: string | null, allowed: readonly T[]): T | null {
    return raw && allowed.includes(raw as T) ? (raw as T) : null
  }

  /** Те саме для списку (?aggregators=bolt,uber) — чужі значення просто відсіюються. */
  static manyOf<T extends string>(raw: readonly string[], allowed: readonly T[]): T[] {
    return raw.filter((value): value is T => allowed.includes(value as T))
  }

  static sortDirection(raw: string | null): SortDirection | null {
    return UrlParamsHelper.oneOf(raw, UrlParamsHelper.SORT_DIRECTIONS)
  }

  /**
   * Список id (?manager_id=01J…,01J…). Білого списку тут немає — id доменні,
   * тому перевіряємо форму: бек на кривий id відповів би 422, а це вилізло б
   * тостом помилки просто через сміття в адресі.
   */
  static ulids(raw: readonly string[]): string[] {
    return raw.filter(value => UrlParamsHelper.ULID.test(value))
  }

  /** Прапорець-перемикач: у URL живе лише як `1`, усе інше — вимкнено. */
  static flag(raw: string | null): boolean {
    return raw === '1'
  }

  /** Значення для запису: вимкнений прапорець в URL не потрапляє. */
  static writeFlag(value: boolean): '1' | null {
    return value ? '1' : null
  }

  /**
   * Фільтр «так / ні / байдуже»: `1` і `0` — сторони, усе інше (зокрема
   * відсутній ключ) — фільтр не заданий. Саме тристан, а не пара прапорців:
   * два ключі під взаємовиключну ознаку дають стан, який не прочитати
   * однозначно (обидва увімкнені — це що?).
   */
  static triState(raw: string | null): boolean | null {
    if (raw === '1') return true
    if (raw === '0') return false

    return null
  }

  /** Значення для запису: «байдуже» в URL не потрапляє. */
  static writeTriState(value: boolean | null): '1' | '0' | null {
    if (value === null) return null

    return value ? '1' : '0'
  }

  /** Сміття й перша сторінка дають 1 — її в URL не пишемо (див. writePage). */
  static page(raw: string | null): number {
    const page = Number(raw)
    return Number.isFinite(page) && page > 1 ? page : 1
  }

  /** Значення для запису: дефолт (сторінка 1) в URL не потрапляє. */
  static writePage(page: number): number | null {
    return page > 1 ? page : null
  }
}
