// Зв'язок таблиці з карткою навколо: шапка, у колонках якої є другі рядки,
// реєструється — і картка показує перемикач щільності. Сама картка колонок не
// бачить, а оголошувати перемикач руками в кожній таблиці — друге місце правки.

import type { InjectionKey } from 'vue'

export interface TableCardContext {
  /** Повертає «відписатись»: таблицю прибрали — перемикач зникає. */
  registerStacked: () => () => void
}

export const TABLE_CARD_KEY: InjectionKey<TableCardContext> = Symbol('tableCard')
