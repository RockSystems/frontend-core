// Зв'язок таблиці з карткою навколо: шапка, у колонках якої є другі рядки,
// реєструється — і картка показує кнопку виду (розгорнутий / стиснутий). Сама
// картка колонок не бачить, а оголошувати кнопку руками в кожній таблиці —
// друге місце правки.

import type { InjectionKey, Ref } from 'vue'

export interface TableCardContext {
  /** Повертає «відписатись»: таблицю прибрали — кнопка зникає. */
  registerSubRows: () => () => void
}

export const TABLE_CARD_KEY: InjectionKey<TableCardContext> = Symbol('tableCard')

// І навпаки: ширини, підтягнуті руками, тримає useVirtualTable у компоненті
// таблиці, а картка — його дитина: звідси кнопка «скинути ширину» в підвалі.
export interface TableWidthsContext {
  /** Є хоч одна ширина руками — є що скидати. */
  hasOwn: Readonly<Ref<boolean>>
  reset: () => void
}

export const TABLE_WIDTHS_KEY: InjectionKey<TableWidthsContext | null> = Symbol('tableWidths')
