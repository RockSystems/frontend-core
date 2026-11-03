// Модель картки KPI. Окремим .ts, а не експортом з .vue: гейт типів — plain
// `tsc`, для нього `*.vue` це заглушка без іменованих експортів (§9a).

import type { Component } from 'vue'

export type UiKpiTone = 'positive' | 'negative' | 'muted'

export interface UiKpiCardItem {
  key: string
  icon: Component
  label: string
  /** Підказка при наведенні на підпис: пояснює те, що в ньому скорочено. */
  labelHint?: string
  /** null = даних ще нема → замість числа скелетон. */
  value: string | null
  /** Приписка в рядку підпису через крапку (напр. частка палива: «Паливо · 12,3%»). */
  note?: string
  tone?: UiKpiTone
}
