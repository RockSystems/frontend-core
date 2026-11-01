// Тип пропа MultiSortHeader — окремим файлом: іменовані експорти з `.vue`
// plain tsc не бачить (див. resources/js/CLAUDE.md §9a).

/**
 * Одне з кількох сортувань колонки: підпис-кнопка і id стовпця, який за це
 * сортування відповідає.
 *
 * Стовпець справжній, просто прихований (`columnVisibility`): сортування
 * тримає TanStack, і без власного стовпця він не міг би ні порахувати номер
 * пріоритету, ні взагалі утримати ключ у стані.
 */
export interface MultiSortPart<TId extends string = string> {
  id: TId
  label: string
  hint?: string
}
