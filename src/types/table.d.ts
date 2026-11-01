import '@tanstack/vue-table'

declare module '@tanstack/vue-table' {
  interface ColumnMeta<TData, TValue> {
    emphasis?: 'positive' | 'muted'
    // Выравнивание колонки (th + td + footer). Для числовых колонок → 'right'.
    align?: 'left' | 'center' | 'right'
    // Пояснение к заголовку: TableHeaderRow рисует значок «i» с этой подсказкой.
    // Для колонок, название которых само по себе не читается («Попередньо»).
    hint?: string
  }
}
