// Реєстр полів серверної таблиці — ОДИН запис на колонку: підпис, підказка,
// ключ сортування з напрямком першого кліку. З нього виводяться карта «колонка ↔
// sort_by», білий список ключів в адресі, панель сортування, приховані стовпці
// й шапка — щоб ці переліки не розходились.
//
// Як дістати значення з рядка, тут НЕ описано — це функція в `*Row.vue`
// (`r => r.metrics.gross_earnings`). Рядковий шлях не покрив би `?.`,
// обчислень і масивів, а по функції працюють ctrl+click і перейменування.

import type { VisibilityState } from '@tanstack/vue-table'
import type { ColumnFieldMeta, ColumnFieldsSource } from '../plugins/table.plugin'
import type { SortKeyOption } from '../components/filters/sortControl.types'
import type { MultiSortPart } from '../components/tables/multiSortHeader.types'
import type { SortDirection } from '../composables/useServerTable'
import { SortHelper } from './sort.helper'

/** Ключ сортування колонки: що слати беку, з чого починати, як підписати напрямки. */
export interface FieldSort<TBy extends string = string> {
  by: TBy
  first: SortDirection
  directions: Record<SortDirection, string>
}

interface FieldBase<TSortBy extends string> {
  header: string
  /** Пояснення до назви: шапка малює значок «i», кнопка частини — title. */
  hint?: string
  sort?: FieldSort<TSortBy>
}

export interface Field<TSortBy extends string> extends FieldBase<TSortBy> {
  /**
   * Складена колонка: кілька чисел — кілька сортувань, кнопками в шапці
   * (MultiSortHeader). Сама вона не сортується, а кожна частина — окремий
   * прихований стовпець: без нього TanStack не втримає ключ у стані й не
   * порахує номер пріоритету.
   */
  parts?: Record<string, FieldBase<TSortBy> & { sort: FieldSort<TSortBy> }>
  /**
   * Носій ключа без видимої колонки: значення показує інша ячейка («Підтвердив»
   * — у статусі звіту) або це вісь групування з панелі («Належність авто»).
   */
  isHidden?: boolean
}

/** Будівники сортувань. Параметр типу — щоб редактор підказував ключі бека. */
export interface SortBuilders<TSortBy extends string> {
  /** Гроші й лічильники: перший клік — максимум. */
  num<K extends TSortBy>(by: K): FieldSort<K>
  /** Текст — з початку абетки. */
  text<K extends TSortBy>(by: K): FieldSort<K>
  /** Дати — новіші згори. */
  date<K extends TSortBy>(by: K): FieldSort<K>
  /** Статуси й типи: бек сортує за кодом, тож «А → Я» тут збрехало б. */
  group<K extends TSortBy>(by: K): FieldSort<K>
  /** Ознака з власними словами («Спочатку авто парку»). */
  custom<K extends TSortBy>(by: K, first: SortDirection, directions: Record<SortDirection, string>): FieldSort<K>
}

const BUILDERS: SortBuilders<string> = {
  // Геттери: поля таблиць оголошені на рівні модуля, а тексти приходять пізніше, у `SharedConfig.configure`.
  num: by => ({ by, first: 'desc', get directions() { return SortHelper.DIRECTIONS.numeric } }),
  text: by => ({ by, first: 'asc', get directions() { return SortHelper.DIRECTIONS.text } }),
  date: by => ({ by, first: 'desc', get directions() { return SortHelper.DIRECTIONS.date } }),
  group: by => ({ by, first: 'asc', get directions() { return SortHelper.DIRECTIONS.group } }),
  custom: (by, first, directions) => ({ by, first, directions }),
}

/** column.id ↔ server sort_by — те, що потрібно мосту сортування (useServerTable). */
export interface ColumnsMap<TId extends string, TSortBy extends string> {
  /** column.id → server sort_by (null = колонка не сортується). */
  readonly byId: Readonly<Record<TId, TSortBy | null>>
  /** Зворотно: server sort_by → column.id. Partial — бек уміє більше, ніж ми виводимо. */
  readonly toId: Readonly<Partial<Record<TSortBy, TId>>>
  /** TanStack віддає column.id рядком — звужуємо до відомого union'а. */
  isId(value: string): value is TId
}

/**
 * Карта колонок типізована ключами, які таблиця РЕАЛЬНО використовує: стор і
 * адреса тримають лише те, що може породити клік, а не весь перелік бека.
 */
export interface TableFields<TId extends string, TSortBy extends string, TUsed extends TSortBy = TSortBy>
  extends ColumnsMap<TId, TUsed>, ColumnFieldsSource<TId> {
  /** Ключі, за якими таблиця вміє сортувати, — білий список для адреси. */
  readonly sortKeys: readonly TUsed[]
  /**
   * Повна назва поля поза шапкою — картка підсумків, панель сортування. Частина
   * складеної колонки — разом із батьком: «сума» окремо не каже, чого.
   */
  label(id: TId): string
  /** Пункти панелі сортування (SortControl) у порядку колонок. */
  readonly sortOptions: ReadonlyArray<SortKeyOption<TUsed>>
  /** `columnVisibility`: приховані стовпці вимкнені. */
  readonly visibility: VisibilityState
  /** Назва й кнопки складеної колонки — пропи MultiSortHeader. */
  multiSortHeader(id: TId): { label: string; parts: ReadonlyArray<MultiSortPart<TId>> }
}

type PartIdsOf<TMap> = {
  [K in keyof TMap]: TMap[K] extends { parts: infer P } ? keyof P : never
}[keyof TMap]

type SortByOf<T> = T extends { sort: FieldSort<infer B> } ? B : never

type UsedSortKeysOf<TMap> = {
  [K in keyof TMap]: SortByOf<TMap[K]>
    | (TMap[K] extends { parts: infer P } ? { [Q in keyof P]: SortByOf<P[Q]> }[keyof P] : never)
}[keyof TMap]

export type FieldIdOf<T> = T extends TableFields<infer TId, string, string> ? TId : never

/** Ключі сортування, які таблиця використовує, — тип сортування в сторі. */
export type SortKeyOf<T> = T extends TableFields<string, string, infer U> ? U : never

/** Ключі бека, яким у таблиці не завели колонку. */
export type MissingSortKeys<TSortBy extends string, T> = Exclude<TSortBy, SortKeyOf<T>>

/** Порожній union — або помилка компіляції. */
export type AssertNever<T extends never> = T

interface FlatField<TSortBy extends string> {
  field: FieldBase<TSortBy>
  parent: string | null
  isHidden: boolean
}

export class TableFieldsHelper {
  // Каррі, як у FormHelper.createSchema: ключі бека задаємо явно, id колонок і
  // використані ключі TS бере з літерала.
  static create<TSortBy extends string>() {
    return <TMap extends Record<string, Field<TSortBy>>>(
      build: (s: SortBuilders<TSortBy>) => TMap,
    ): TableFields<Extract<keyof TMap | PartIdsOf<TMap>, string>, TSortBy, UsedSortKeysOf<TMap> & TSortBy> => {
      type TId = Extract<keyof TMap | PartIdsOf<TMap>, string>
      type TUsed = UsedSortKeysOf<TMap> & TSortBy

      const flat = new Map<string, FlatField<TSortBy>>()
      const add = (id: string, entry: FlatField<TSortBy>): void => {
        // Частина з тим самим id, що й колонка, мовчки перезаписала б її.
        if (flat.has(id)) throw new Error(`TableFieldsHelper: id "${id}" is declared twice`)
        flat.set(id, entry)
      }

      for (const [id, field] of Object.entries(build(BUILDERS as SortBuilders<TSortBy>))) {
        add(id, { field, parent: null, isHidden: field.isHidden === true })
        for (const [partId, part] of Object.entries(field.parts ?? {})) {
          add(partId, { field: part, parent: id, isHidden: true })
        }
      }

      const entryOf = (id: string): FlatField<TSortBy> => {
        const entry = flat.get(id)
        if (!entry) throw new Error(`TableFieldsHelper: unknown column id "${id}"`)

        return entry
      }

      const entries = [...flat.entries()]
      const sorted = entries.flatMap(([id, { field }]) => field.sort ? [{ id, sort: field.sort }] : [])
      const hiddenIds = entries.filter(([, entry]) => entry.isHidden).map(([id]) => id as TId)

      const label = (id: string): string => {
        const { field, parent } = entryOf(id)

        return parent === null ? field.header : `${entryOf(parent).field.header}, ${field.header}`
      }

      return {
        byId: Object.fromEntries(entries.map(([id, { field }]) => [id, field.sort?.by ?? null])) as Record<TId, TUsed | null>,
        toId: Object.fromEntries(sorted.map(({ id, sort }) => [sort.by, id])) as Partial<Record<TUsed, TId>>,
        isId: (value: string): value is TId => flat.has(value),

        column: (id: TId): ColumnFieldMeta => {
          const { field } = entryOf(id)

          return {
            header: field.header,
            hint: field.hint,
            isSortable: field.sort !== undefined,
            isDescFirst: field.sort?.first === 'desc',
          }
        },
        hiddenIds,

        label,
        sortKeys: sorted.map(({ sort }) => sort.by as TUsed),
        sortOptions: sorted.map(({ id, sort }) => ({
          value: sort.by as TUsed,
          label: label(id),
          get directions() { return sort.directions },
          defaultDirection: sort.first,
        })),
        visibility: Object.fromEntries(hiddenIds.map(id => [id, false])),

        multiSortHeader: (id: TId) => ({
          label: entryOf(id).field.header,
          parts: entries
            .filter(([, entry]) => entry.parent === id)
            .map(([partId, { field }]) => ({ id: partId as TId, label: field.header, hint: field.hint })),
        }),
      }
    }
  }
}
