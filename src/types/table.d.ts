import '@tanstack/vue-table'
import type { CellContext } from '@tanstack/vue-table'
import type { VNodeChild } from 'vue'

declare module '@tanstack/vue-table' {
  interface ColumnMeta<TData, TValue> {
    emphasis?: 'positive' | 'muted'
    /**
     * Вид колонки — від нього ширина (useVirtualTable):
     * • `value` (за замовчуванням) — дата, сума, номер, статус, імʼя: не ріжеться,
     *   ширина — за найширшим значенням;
     * • `text` — опис, коментар, адреса, плашки: забирає вільне місце, довге
     *   ріжеться «…», клік по обрізаному відкриває повний текст;
     * • `actions` — кнопки рядка: ширина за вмістом, притиснуті праворуч.
     * Колонка з id `actions` — `actions` і без позначки.
     */
    kind?: 'value' | 'text' | 'actions'
    /** Текстова колонка переносить рядки — до трьох, далі «…». Без нього — один рядок, як в Excel. */
    wrap?: boolean
    // Выравнивание колонки (th + td + footer). Для числовых колонок → 'right'.
    align?: 'left' | 'center' | 'right'
    // Пояснение к заголовку: TableHeaderRow рисует значок «i» с этой подсказкой.
    // Для колонок, название которых само по себе не читается («Попередньо»).
    hint?: string
    // Другий рядок колонки: під основним значенням — деталь (контакти під ПІБ,
    // менеджер під статусом). Збирає `ctx.sub()` з реєстру полів.
    sub?: ColumnSub<TData, TValue>
  }

  interface ColumnSub<TData, TValue> {
    /** Поле реєстру: підпис у шапці, а для сортованого — прихований стовпець-носій. */
    id: string
    header: string
    isSortable: boolean
    cell: (context: CellContext<TData, TValue>) => VNodeChild
  }
}
