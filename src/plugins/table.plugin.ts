import { type CellContext, type ColumnDef, createColumnHelper, type DisplayColumnDef } from '@tanstack/vue-table'
import { Component, h, type VNode, VNodeChild } from 'vue'
import AmountCell from '../components/tables/cells/AmountCell.vue'
import DateTimeCell from '../components/tables/cells/DateTimeCell.vue'
import MoneyCell from '../components/tables/cells/MoneyCell.vue'
import SimpleCell from '../components/tables/cells/SimpleCell.vue'
import { ExtractComponentPublicProps } from '../types/vue-utils'

/** Дістає число з рядка — воно ж іде і в клітинку, і в підсумок. */
type Pick<TData> = (row: TData) => number

// Общий реестр cell-компонентов. Автоматически мерджится в каждый фичевый
// helper через TableHelperFactory.createHelper — фичам остаётся регистрировать
// только специфичные cells.
//
// Доступны во всех фичах:
//   • MoneyCell      — { value: number|null, emphasis?: 'positive'|'muted' }
//   • AmountCell     — { value: number|null, suffix?, precision?, emphasis? }
//   • DateTimeCell   — { value: number|string|null, source?, format? }
//   • SimpleCell     — { text, subText? }

/**
 * Що фабриці треба знати про колонку, щоб не питати це в кожному `*Row.vue`:
 * назва, підказка, чи сортується і з якого напрямку. Джерело — реєстр полів
 * фічі (`TableFieldsHelper` у shared); тут лише форма, бо _shared у shared не
 * заглядає.
 */
export interface ColumnFieldMeta {
  header: string
  hint?: string
  isSortable: boolean
  isDescFirst: boolean
}

export interface ColumnFieldsSource<TId extends string> {
  column(id: TId): ColumnFieldMeta
  /** Приховані стовпці-носії сортування — фабрика заводить їх сама. */
  readonly hiddenIds: readonly TId[]
}

/** Хвіст налаштувань числової колонки. Назву й сортування бере реєстр полів. */
interface ValueColumnOptions {
  emphasis?: 'positive' | 'muted'
  /**
   * ГОТОВИЙ підсумок колонки — агрегат бека по всій вибірці фільтра.
   *
   * Не задано — футера немає. Суму видимих рядків не підставляємо: вона стрибає
   * від сторінки, а читається як підсумок періоду. Порожню комірку помітно,
   * неправильне число — ні.
   */
  footer?: () => number | null
}

interface NumColumnOptions extends ValueColumnOptions {
  /** «км», «хв», «поїздок» — той самий suffix іде і в підсумок. */
  suffix?: string
  precision?: number
}

/** Решта ColumnDef: ячейка, футер, вирівнювання, шапка-компонент замість назви. */
type ColumnOptions<TData> = Omit<DisplayColumnDef<TData, any>, 'id'>

const CellRegistry = {
  // презентационные
  MoneyCell,
  AmountCell,
  DateTimeCell,
  SimpleCell,
} as const

export class TableHelperFactory {
  /**
   * Каррі: тип рядка задаємо явно (з полів він не виводиться), id колонок TS
   * бере з реєстру полів.
   */
  static createHelper<TData>() {
    return <TId extends string, TR extends Record<string, Component>>(
      fields: ColumnFieldsSource<TId>,
      registry: TR,
    ) => {
      type Registry = TR & typeof CellRegistry
      type CellFn = (ctx: CellContext<TData, any>) => VNodeChild

      interface ColumnContext {
        /** Строго типізовані пропси ячейки з реєстру cell-компонентів. */
        cell: <K extends keyof Registry>(
          key: K,
          build: (ctx: CellContext<TData, any>) => ExtractComponentPublicProps<Registry[K]>,
        ) => CellFn
        /** Сирий h() — для фрагментів, слотів та інших винятків. */
        cellRaw: (build: (ctx: CellContext<TData, any>) => VNode | VNodeChild) => CellFn
        /** Колонка зі значенням: назва, підказка й сортування — з реєстру полів. */
        accessor: (id: TId, pick: (row: TData) => unknown, options?: ColumnOptions<TData>) => ColumnDef<TData, any>
        /** Колонка без значення (дії, збірна ячейка): сортувати нічого. */
        display: (id: TId, options?: ColumnOptions<TData>) => ColumnDef<TData, any>
        /**
         * Числова колонка одним рядком: ячейка + вирівнювання праворуч (+ футер,
         * якщо передали тотал). Це був найчастіший копіпаст, і футери в копіях
         * уже розійшлися.
         */
        money: (id: TId, pick: Pick<TData>, options?: ValueColumnOptions) => ColumnDef<TData, any>
        num: (id: TId, pick: Pick<TData>, options?: NumColumnOptions) => ColumnDef<TData, any>
        /**
         * Готовий грошовий підсумок для колонки зі СВОЄЮ ячейкою — там, де
         * `money()` не підходить (ставка поруч із сумою, тижні абонплати).
         */
        moneyTotal: (value: number | null, emphasis?: ValueColumnOptions['emphasis']) => VNode
      }

      const cells = { ...CellRegistry, ...registry } as Registry
      const ch = createColumnHelper<TData>()

      const meta = (id: TId, own: ColumnOptions<TData>['meta']) => ({ hint: fields.column(id).hint, ...own })

      const ctx: ColumnContext = {
        cell: (key, build) => cellCtx => h(cells[key], build(cellCtx)),
        cellRaw: build => cellCtx => build(cellCtx),

        accessor: (id, pick, options = {}) => {
          const field = fields.column(id)

          return ch.accessor(pick, {
            id,
            header: field.header,
            enableSorting: field.isSortable,
            sortDescFirst: field.isDescFirst,
            ...options,
            meta: meta(id, options.meta),
          }) as ColumnDef<TData, any>
        },

        display: (id, options = {}) => ch.display({
          id,
          header: fields.column(id).header,
          ...options,
          meta: meta(id, options.meta),
        }) as ColumnDef<TData, any>,

        money: (id, pick, { emphasis, footer } = {}) => ctx.accessor(id, pick, {
          cell: c => h(MoneyCell, { value: pick(c.row.original), emphasis }),
          // Підсумок теж через MoneyCell — щоб мінусовий тотал червонів так
          // само, як мінусова клітинка.
          footer: footer && (() => h(MoneyCell, { value: footer(), emphasis })),
          meta: { align: 'right' },
        }),

        num: (id, pick, { footer, ...cellProps } = {}) => ctx.accessor(id, pick, {
          cell: c => h(AmountCell, { value: pick(c.row.original), ...cellProps }),
          footer: footer && (() => h(AmountCell, { value: footer(), ...cellProps })),
          meta: { align: 'right' },
        }),

        moneyTotal: (value, emphasis) => h(MoneyCell, { value, emphasis }),
      }

      // Приховані стовпці-носії: значення їм не потрібне (сортує бек), але без
      // accessorFn TanStack не вважає стовпець сортованим і не тримає ключ.
      const hidden = (): Array<ColumnDef<TData, any>> => fields.hiddenIds.map(id => ch.accessor(() => null, {
        id,
        header: '',
        enableSorting: true,
        sortDescFirst: fields.column(id).isDescFirst,
      }) as ColumnDef<TData, any>)

      return {
        /** Колонки таблиці. `*Row.vue` описує лише видимі — приховані додаються самі. */
        columns: (config: (ctx: ColumnContext) => Array<ColumnDef<TData, any>>): Array<ColumnDef<TData, any>> =>
          [...config(ctx), ...hidden()],
      }
    }
  }
}
