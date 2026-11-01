// Міст між нашим Period ({from,to} у 'YYYY-MM-DD') і reka-ui RangeCalendar,
// що працює на @internationalized/date (CalendarDate). Плюс недільний снап
// (Пн–Вс, локаль uk) для режиму звітів.

import { CalendarDate, type DateValue, parseDate } from '@internationalized/date'
import dayjs from 'dayjs'
import type { DateRange } from 'reka-ui'
import { DateHelper } from './date.helper'
import type { Period } from './period.helper'
import { PeriodLabelHelper } from './periodLabel.helper'

export class CalendarRangeHelper {
  // Пн — reka weekStartsOn; дублюємо для снапу через dayjs (локаль uk теж Пн).
  static readonly WEEK_STARTS_ON = 1 as const

  // 'YYYY-MM-DD' → CalendarDate. Порожнє/криве — undefined (не кидаємо: у полі
  // період може бути ще не обраний).
  static toCalendarDate(iso: string | null | undefined): CalendarDate | undefined {
    if (!iso) return undefined
    try {
      return parseDate(iso)
    } catch {
      return undefined
    }
  }

  static toRange(period: Period): DateRange {
    return {
      start: CalendarRangeHelper.toCalendarDate(period.from),
      end: CalendarRangeHelper.toCalendarDate(period.to),
    }
  }

  // Обидва кінці мають бути обрані — інакше період неповний і не комітиться.
  static toPeriod(range: DateRange): Period | null {
    if (!range.start || !range.end) return null
    return { from: range.start.toString(), to: range.end.toString() }
  }

  // Розтягує будь-який діапазон до цілих тижнів: start → понеділок, end → неділя.
  static snapToWeeks(range: DateRange): DateRange {
    if (!range.start) return { start: undefined, end: undefined }

    const monday = CalendarRangeHelper.weekStart(range.start)
    // Поки обрано лише один кінець — тримаємо end порожнім (reka лишається в
    // режимі вибору, даючи дотиснути другий тиждень). Знімати до неділі рано.
    if (!range.end) return { start: monday, end: undefined }

    const [lo, hi] = CalendarRangeHelper.order(range.start, range.end)
    return { start: CalendarRangeHelper.weekStart(lo), end: CalendarRangeHelper.weekEnd(hi) }
  }

  private static order(a: DateValue, b: DateValue): [DateValue, DateValue] {
    return a.compare(b) <= 0 ? [a, b] : [b, a]
  }

  private static weekStart(date: DateValue): CalendarDate {
    return CalendarRangeHelper.fromDayjs(dayjs(date.toString()).startOf('week'))
  }

  private static weekEnd(date: DateValue): CalendarDate {
    return CalendarRangeHelper.fromDayjs(dayjs(date.toString()).endOf('week'))
  }

  private static fromDayjs(d: dayjs.Dayjs): CalendarDate {
    return parseDate(d.format(DateHelper.DEFAULT_DATE_FORMAT))
  }

  // Підпис поля-тригера: розумний діапазон зі схлопуванням спільних частин
  // ("2–8 лют. 2026" · "8 січ. – 8 лют. 2026"). Порожньо — заглушка в компоненті.
  static label(period: Period): string {
    return PeriodLabelHelper.range(period.from, period.to)
  }
}
