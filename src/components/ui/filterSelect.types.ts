export interface FilterOption<V> {
  value: V
  label: string
  // Коротка назва для підпису кнопки (у списку показується повний label).
  short?: string
}

/** Сторінка віддаленого довідника: тисячі авто чи водіїв разом не вантажимо. */
export interface FilterPage<V> {
  items: Array<FilterOption<V>>
  lastPage: number
}
