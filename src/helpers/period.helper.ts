// Утилиты подсчёта периодов для дашбордов. Возвращают единый формат
// `{from, to}` (строки YYYY-MM-DD). Так же используется как тип-стандарт
// для period-фильтров в фичах.

import dayjs from 'dayjs'
import quarterOfYear from 'dayjs/plugin/quarterOfYear'
import { DateHelper } from './date.helper'

dayjs.extend(quarterOfYear)

export interface Period {
  from: string
  to: string
}

/** Масштаб периода: календарная единица, которой он в точности равен, либо произвольный `range`. */
export type PeriodUnit = 'day' | 'week' | 'month' | 'quarter' | 'year' | 'range'

export class PeriodHelper {
  /** Длина периода в днях, края включительно: 03.08–09.08 = 7. */
  static daysIn(period: Period): number {
    return dayjs(period.to).startOf('day').diff(dayjs(period.from).startOf('day'), 'day') + 1
  }

  /**
   * Масштаб выбранного диапазона. Порядок проверок — от крупного к мелкому:
   * 01.01–31.03 это квартал, а не «месяц, который начался с начала месяца».
   */
  static unitOf(period: Period): PeriodUnit {
    const from = dayjs(period.from)
    const to = dayjs(period.to)
    const isWhole = (start: dayjs.Dayjs, end: dayjs.Dayjs): boolean =>
      from.isSame(start, 'day') && to.isSame(end, 'day')

    if (from.isSame(to, 'day')) return 'day'
    if (isWhole(from.startOf('year'), from.endOf('year'))) return 'year'
    if (isWhole(from.startOf('quarter'), from.endOf('quarter'))) return 'quarter'
    if (isWhole(from.startOf('month'), from.endOf('month'))) return 'month'
    if (isWhole(from.startOf('week'), from.endOf('week'))) return 'week'
    return 'range'
  }

  /**
   * Сдвиг периода на `delta` шагов ЕГО ЖЕ масштаба: месяц едет по месяцам,
   * квартал по кварталам. Произвольный диапазон — на собственную длину.
   */
  static shift(period: Period, delta: number): Period {
    const unit = PeriodHelper.unitOf(period)
    const fmt = DateHelper.DEFAULT_DATE_FORMAT

    if (unit === 'range') {
      const days = PeriodHelper.daysIn(period) * delta
      return {
        from: dayjs(period.from).add(days, 'day').format(fmt),
        to: dayjs(period.to).add(days, 'day').format(fmt),
      }
    }

    if (unit === 'day') {
      const day = dayjs(period.from).add(delta, 'day').format(fmt)
      return { from: day, to: day }
    }

    // Квартал отдельной веткой: в типах dayjs 'quarter' живёт в QUnitType, а
    // 'week' — в OpUnitType, и одним союзом их не передать.
    if (unit === 'quarter') {
      const anchor = dayjs(period.from).add(delta * 3, 'month')
      return {
        from: anchor.startOf('quarter').format(fmt),
        to: anchor.endOf('quarter').format(fmt),
      }
    }

    const anchor = dayjs(period.from).add(delta, unit)
    return {
      from: anchor.startOf(unit).format(fmt),
      to: anchor.endOf(unit).format(fmt),
    }
  }

  /** Последние N дней включительно (включая сегодня). */
  static lastNDays(n: number): Period {
    return {
      from: dayjs().subtract(n - 1, 'day').format(DateHelper.DEFAULT_DATE_FORMAT),
      to: dayjs().format(DateHelper.DEFAULT_DATE_FORMAT),
    }
  }

  /** Сегодня (один день). */
  static today(): Period {
    const d = dayjs().format(DateHelper.DEFAULT_DATE_FORMAT)
    return { from: d, to: d }
  }

  /** Вчера (один день). */
  static yesterday(): Period {
    const d = dayjs().subtract(1, 'day').format(DateHelper.DEFAULT_DATE_FORMAT)
    return { from: d, to: d }
  }

  /** Последние N целых недель, включая текущую (Пн … Вс текущей). */
  static lastNWeeks(n: number): Period {
    return {
      from: dayjs().subtract(n - 1, 'week').startOf('week').format(DateHelper.DEFAULT_DATE_FORMAT),
      to: dayjs().endOf('week').format(DateHelper.DEFAULT_DATE_FORMAT),
    }
  }

  /** Текущая календарная неделя (локаль uk → с понедельника). */
  static currentWeek(): Period {
    return {
      from: dayjs().startOf('week').format(DateHelper.DEFAULT_DATE_FORMAT),
      to: dayjs().endOf('week').format(DateHelper.DEFAULT_DATE_FORMAT),
    }
  }

  /** Предыдущая календарная неделя. */
  static prevWeek(): Period {
    const prev = dayjs().subtract(1, 'week')
    return {
      from: prev.startOf('week').format(DateHelper.DEFAULT_DATE_FORMAT),
      to: prev.endOf('week').format(DateHelper.DEFAULT_DATE_FORMAT),
    }
  }

  /** Текущий календарный месяц. */
  static currentMonth(): Period {
    return {
      from: dayjs().startOf('month').format(DateHelper.DEFAULT_DATE_FORMAT),
      to: dayjs().endOf('month').format(DateHelper.DEFAULT_DATE_FORMAT),
    }
  }

  /** Предыдущий календарный месяц. */
  static prevMonth(): Period {
    const prev = dayjs().subtract(1, 'month')
    return {
      from: prev.startOf('month').format(DateHelper.DEFAULT_DATE_FORMAT),
      to: prev.endOf('month').format(DateHelper.DEFAULT_DATE_FORMAT),
    }
  }

  /** Текущий календарный квартал. */
  static currentQuarter(): Period {
    return {
      from: dayjs().startOf('quarter').format(DateHelper.DEFAULT_DATE_FORMAT),
      to: dayjs().endOf('quarter').format(DateHelper.DEFAULT_DATE_FORMAT),
    }
  }

  /** Предыдущий календарный квартал. */
  static prevQuarter(): Period {
    const prev = dayjs().subtract(1, 'quarter')
    return {
      from: prev.startOf('quarter').format(DateHelper.DEFAULT_DATE_FORMAT),
      to: prev.endOf('quarter').format(DateHelper.DEFAULT_DATE_FORMAT),
    }
  }

  /** Текущий календарный год. */
  static currentYear(): Period {
    return {
      from: dayjs().startOf('year').format(DateHelper.DEFAULT_DATE_FORMAT),
      to: dayjs().endOf('year').format(DateHelper.DEFAULT_DATE_FORMAT),
    }
  }

  /** Предыдущий календарный год. */
  static prevYear(): Period {
    const prev = dayjs().subtract(1, 'year')
    return {
      from: prev.startOf('year').format(DateHelper.DEFAULT_DATE_FORMAT),
      to: prev.endOf('year').format(DateHelper.DEFAULT_DATE_FORMAT),
    }
  }
}
