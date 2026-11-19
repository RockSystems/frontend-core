// Зв'язок таблиці з карткою навколо: шапка, у колонках якої є другі рядки,
// реєструється — і картка показує кнопку виду (розгорнутий / стиснутий). Сама
// картка колонок не бачить, а оголошувати кнопку руками в кожній таблиці —
// друге місце правки.

import type { InjectionKey } from 'vue'

export interface TableCardContext {
  /** Повертає «відписатись»: таблицю прибрали — кнопка зникає. */
  registerSubRows: () => () => void
}

export const TABLE_CARD_KEY: InjectionKey<TableCardContext> = Symbol('tableCard')
