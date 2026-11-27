// Вид колонки (meta.kind) — одне місце: комірки ставлять його в `data-kind`, а
// useVirtualTable за ним ділить ширину.

import type {} from '../../types/table'
import type { Column } from '@tanstack/vue-table'

export type ColumnKind = 'value' | 'text' | 'actions'

export const TableColumnKind = {
  /** Без позначки — `value`; колонка `actions` — кнопки рядка й без позначки. */
  of(column: Column<any, unknown>): ColumnKind {
    return column.columnDef.meta?.kind ?? (column.id === 'actions' ? 'actions' : 'value')
  },
}
