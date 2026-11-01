// Типи SortControl окремим .ts, а не експортом із .vue: гейт типів — plain
// `tsc`, для нього `*.vue` це заглушка без іменованих експортів (§9a CLAUDE.md).

import type { ServerSortEntry, SortDirection } from '../../composables/useServerTable'

/**
 * Ключ, за яким можна сортувати: що це, як підписати обидва напрямки і з якого
 * починати.
 *
 * Напрямки підписуємо СЛОВАМИ, а не «asc/desc»: для грошей зрозуміло і те й
 * інше, а для ознаки на кшталт «наше авто» — ні. «Спочатку авто парку» відповідає на
 * питання користувача, «за зростанням» лише називає механіку.
 */
export interface SortKeyOption<TBy extends string = string> {
  value: TBy
  label: string
  directions: Record<SortDirection, string>
  /**
   * Напрямок при першому додаванні ключа. Для чисел і дат цікавий максимум,
   * для тексту — початок алфавіту.
   */
  defaultDirection: SortDirection
}

export type { ServerSortEntry as SortEntry, SortDirection }
