// Розумні підписи періоду. Ключове — форматування діапазону дат саме нативним
// Intl.DateTimeFormat.formatRange: він СХЛОПУЄ спільні частини так, як просили
// менеджери, без власного велосипеда і сторонніх бібліотек:
//   в межах місяця   → "2–8 лют. 2026"
//   через 2 місяці   → "8 січ. – 8 лют. 2026"
//   через 2 роки     → "5 січ. 2026 – 5 січ. 2027"
// Плюс ISO-номер тижня (Пн–Нд) для лейбли "тиждень N".

import dayjs from 'dayjs'
import { SharedConfig } from '../config'
import isoWeek from 'dayjs/plugin/isoWeek'

dayjs.extend(isoWeek)

export class PeriodLabelHelper {
  // Лінивий: мову задає проєкт, а модуль імпортується раніше за `SharedConfig.configure`.
  private static rangeFormat: Intl.DateTimeFormat | null = null

  private static format(): Intl.DateTimeFormat {
    // timeZone UTC: `new Date('2026-02-02')` — північ UTC, і в поясі західніше UTC
    // підпис без нього з'їжджав на день назад.
    PeriodLabelHelper.rangeFormat ??= new Intl.DateTimeFormat(SharedConfig.get().labels.dateLocale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    })

    return PeriodLabelHelper.rangeFormat
  }

  /**
   * Розумний підпис діапазону: схлопує спільні місяць/рік.
   * Один день → одна дата ("2 лют. 2026").
   */
  static range(from: string, to: string): string {
    const a = new Date(from)
    const b = new Date(to)
    // formatRange додає суфікс " р."/" рр." (рік/роки) наприкінці — це шум для
    // компактної лейбли, прибираємо.
    return PeriodLabelHelper.format().formatRange(a, b).replace(SharedConfig.get().labels.rangeYearSuffix, '')
  }

  /** Діапазон — рівна кількість цілих тижнів (початок Пн, кінець Нд). */
  static isWholeWeeks(from: string, to: string): boolean {
    return dayjs(from).isoWeekday() === 1 && dayjs(to).isoWeekday() === 7
  }

  /** Рівно один тиждень (Пн–Нд, 7 днів). */
  static isSingleWeek(from: string, to: string): boolean {
    return PeriodLabelHelper.isWholeWeeks(from, to)
      && dayjs(to).diff(dayjs(from), 'day') === 6
  }

  /** ISO-номер тижня дати. */
  static isoWeek(date: string): number {
    return dayjs(date).isoWeek()
  }

  /**
   * Лейбл тижнів для діапазону, кратного тижням: "тиждень 6" або "тижні 6–9".
   * null — діапазон не кратний цілим тижням.
   */
  static weeksLabel(from: string, to: string): string | null {
    if (!PeriodLabelHelper.isWholeWeeks(from, to)) return null

    const first = PeriodLabelHelper.isoWeek(from)
    const last = PeriodLabelHelper.isoWeek(to)
    const { weekLabel, weeksLabel } = SharedConfig.get().labels

    return first === last ? weekLabel(first) : weeksLabel(first, last)
  }
}
