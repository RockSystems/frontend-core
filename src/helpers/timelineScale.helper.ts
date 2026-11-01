// Кусково-лінійна шкала часу зі «схлопуванням» порожнеч.
//
// Навіщо: на смузі періодів цікаві лише проміжки, де щось відбувалось. Лінійна
// вісь віддає порожньому півріччю рівно стільки ж місця, скільки насиченому
// тижню, і смуга перетворюється на дві цятки по краях. Тут порожнечі, довші за
// поріг, стискаються у вузький розрив фіксованої ширини, а вся решта ширини
// ділиться між «живими» відрізками пропорційно їхній тривалості.
//
// Це НЕ бібліотечна шкала: у d3/chart-либ вісь часу лінійна за визначенням, і
// розрив у них доводиться імітувати. Тут він — суть, тож рахуємо самі.
//
// Одиниця — календарний день: періоди в нас доменно поденні (дати без часу).

import dayjs, { type Dayjs } from 'dayjs'

const DAY = 'YYYY-MM-DD'

/** Скільки днів дорисовуємо навколо відрізка, щоб смужка не впиралась у розрив. */
const PAD_DAYS = 2

/** Коротші порожнечі не ріжемо: розрив коштує більше місця, ніж economить. */
const MIN_GAP_DAYS = 14

/** Ширина розриву на екрані. */
const BREAK_PX = 18

/** Мінімальна ширина смужки — щоб одноденний період було видно й натиснути. */
const MIN_SPAN_PX = 3

export interface TimelineSpan {
  from: string
  /** null — період ще триває; праву межу бере «сьогодні». */
  to: string | null
}

export interface TimelineSegment {
  from: string
  to: string
  x: number
  width: number
}

export interface TimelineBreak {
  x: number
  /** Скільки днів сховано — показуємо підписом/тултипом. */
  days: number
  from: string
  to: string
}

export interface TimelineTick {
  x: number
  date: string
  /** Перший тик відрізка: біля нього ставимо рік, далі — самі місяці. */
  isSegmentStart: boolean
}

export interface TimelineScale {
  width: number
  isEmpty: boolean
  pxPerDay: number
  segments: TimelineSegment[]
  breaks: TimelineBreak[]
  /**
   * Крайні дати САМИХ ДАНИХ. Не межі намальованого поля: воно ширше на
   * технічний відступ, і його край — дата, якої в даних немає.
   */
  bounds: { from: string; to: string } | null
  /** Позиція дати в пікселях. Дата всередині розриву прилипає до його краю. */
  xOf(date: string): number
  /** Готова геометрія смужки: `to = null` тягнеться до «сьогодні». */
  spanOf(from: string, to: string | null): { x: number; width: number }
}

interface Range { from: Dayjs; to: Dayjs }

/** Мінімальний просвіт між підписами місяців — інакше вони наїжджають. */
const MIN_TICK_PX = 34

/** Тижневі риски малюємо, лише коли тиждень займає стільки пікселів. */
const MIN_WEEK_PX = 9

const EMPTY: TimelineScale = {
  width: 0,
  isEmpty: true,
  pxPerDay: 0,
  segments: [],
  breaks: [],
  bounds: null,
  xOf: () => 0,
  spanOf: () => ({ x: 0, width: 0 }),
}

export class TimelineScaleHelper {
  /**
   * Побудувати шкалу під набір періодів.
   *
   * @param spans  усі періоди, які треба вмістити (з усіх доріжок разом —
   *               інакше доріжки поїдуть одна відносно одної)
   * @param width  доступна ширина смуги в пікселях
   */
  static build(spans: TimelineSpan[], width: number, today: Dayjs = dayjs()): TimelineScale {
    if (width <= 0) return EMPTY

    const ranges = TimelineScaleHelper.toRanges(spans, today)
    if (!ranges.length) return EMPTY

    // Межі беремо ДО відступу: підпис має показувати дату з даних, а не край
    // намальованого поля (він на PAD_DAYS далі й такої події не було).
    const dataBounds = {
      from: ranges.reduce((min, r) => (r.from.isBefore(min) ? r.from : min), ranges[0].from)
        .add(PAD_DAYS, 'day').format(DAY),
      to: ranges.reduce((max, r) => (r.to.isAfter(max) ? r.to : max), ranges[0].to)
        .subtract(PAD_DAYS, 'day').format(DAY),
    }

    const merged = TimelineScaleHelper.merge(ranges)

    // Скільки днів реально показуємо + скільки розривів між ними.
    const contentDays = merged.reduce((acc, r) => acc + TimelineScaleHelper.days(r), 0)
    const breaksCount = merged.length - 1
    const usable = width - breaksCount * BREAK_PX

    // Розривів стільки, що на самі відрізки місця не лишилось — краще показати
    // все лінійно, ніж намалювати смугу з самих розривів.
    const pxPerDay = usable > 0 ? usable / contentDays : width / contentDays
    const breakPx = usable > 0 ? BREAK_PX : 0

    const segments: TimelineSegment[] = []
    const breaks: TimelineBreak[] = []
    let cursor = 0

    merged.forEach((range, i) => {
      const segmentWidth = TimelineScaleHelper.days(range) * pxPerDay

      segments.push({
        from: range.from.format(DAY),
        to: range.to.format(DAY),
        x: cursor,
        width: segmentWidth,
      })

      cursor += segmentWidth

      const next = merged[i + 1]
      if (!next) return

      breaks.push({
        x: cursor,
        days: next.from.diff(range.to, 'day') - 1,
        from: range.to.format(DAY),
        to: next.from.format(DAY),
      })

      cursor += breakPx
    })

    return TimelineScaleHelper.assemble(width, segments, breaks, pxPerDay, today, dataBounds)
  }

  /**
   * Порожнечі, які варто сховати, — самі дати, без прив'язки до ширини.
   *
   * Для сторонніх смуг часу (vis-timeline `hiddenDates`), яким потрібні саме
   * діапазони. Правило те саме, що й у власної шкали: зливаємо близькі періоди,
   * ріжемо лише те, що лишилось між ними.
   */
  static gaps(spans: TimelineSpan[], today: Dayjs = dayjs()): { start: string; end: string }[] {
    const merged = TimelineScaleHelper.merge(TimelineScaleHelper.toRanges(spans, today))

    return merged.slice(0, -1).map((range, i) => ({
      start: range.to.add(1, 'day').format(DAY),
      end: merged[i + 1].from.format(DAY),
    }))
  }

  /** Крайні дати даних — межі вікна для сторонньої смуги. */
  static extent(spans: TimelineSpan[], today: Dayjs = dayjs()): { from: string; to: string } | null {
    const merged = TimelineScaleHelper.merge(TimelineScaleHelper.toRanges(spans, today))
    if (!merged.length) return null

    return {
      from: merged[0].from.format(DAY),
      to: merged[merged.length - 1].to.format(DAY),
    }
  }

  /**
   * Риски місяців. Перша в кожному відрізку — його власна дата (біля неї видно
   * рік), далі перші числа місяців. Ті, що не влазять без наїзду, відкидаємо.
   */
  static monthTicks(scale: TimelineScale): TimelineTick[] {
    if (scale.isEmpty) return []

    const ticks: TimelineTick[] = []

    scale.segments.forEach((segment) => {
      const to = dayjs(segment.to)
      ticks.push({ x: segment.x, date: segment.from, isSegmentStart: true })

      let month = dayjs(segment.from).startOf('month')
      if (month.isBefore(segment.from, 'day')) month = month.add(1, 'month')

      for (; !month.isAfter(to, 'day'); month = month.add(1, 'month')) {
        const x = scale.xOf(month.format(DAY))

        if (x - ticks[ticks.length - 1].x < MIN_TICK_PX) continue

        ticks.push({ x, date: month.format(DAY), isSegmentStart: false })
      }
    })

    return ticks
  }

  /** Дрібні риски по понеділках — тільки коли для них справді є місце. */
  static weekTicks(scale: TimelineScale): number[] {
    if (scale.isEmpty || scale.pxPerDay * 7 < MIN_WEEK_PX) return []

    return scale.segments.flatMap((segment) => {
      const to = dayjs(segment.to)
      const xs: number[] = []

      // Понеділок рахуємо явно, без локалі: у dayjs без неї тиждень з неділі.
      const start = dayjs(segment.from)
      let week = start.subtract((start.day() + 6) % 7, 'day')
      if (week.isBefore(start, 'day')) week = week.add(7, 'day')

      for (; !week.isAfter(to, 'day'); week = week.add(7, 'day')) {
        xs.push(scale.xOf(week.format(DAY)))
      }

      return xs
    })
  }

  // Зводимо сирі періоди до дат-меж: відкриті закриваємо «сьогодні», сміття
  // (нерозпізнані або перевернуті дати) відкидаємо — воно зламало б шкалу.
  private static toRanges(spans: TimelineSpan[], today: Dayjs): Range[] {
    return spans.reduce<Range[]>((acc, span) => {
      const from = dayjs(span.from)
      const to = span.to ? dayjs(span.to) : today

      if (!from.isValid() || !to.isValid() || to.isBefore(from, 'day')) return acc

      acc.push({ from: from.subtract(PAD_DAYS, 'day'), to: to.add(PAD_DAYS, 'day') })

      return acc
    }, [])
  }

  // Зливаємо перекриті й близькі відрізки: розрив вартий свого місця лише коли
  // порожнеча справді велика.
  private static merge(ranges: Range[]): Range[] {
    const sorted = [...ranges].sort((a, b) => a.from.valueOf() - b.from.valueOf())

    return sorted.reduce<Range[]>((acc, range) => {
      const last = acc[acc.length - 1]

      if (last && range.from.diff(last.to, 'day') <= MIN_GAP_DAYS) {
        if (range.to.isAfter(last.to)) last.to = range.to

        return acc
      }

      acc.push({ ...range })

      return acc
    }, [])
  }

  private static days(range: Range): number {
    return range.to.diff(range.from, 'day') + 1
  }

  private static assemble(
    width: number,
    segments: TimelineSegment[],
    breaks: TimelineBreak[],
    pxPerDay: number,
    today: Dayjs,
    bounds: { from: string; to: string },
  ): TimelineScale {
    const xOf = (date: string): number => {
      const day = dayjs(date)
      if (!day.isValid()) return 0

      // До початку шкали / після кінця — притискаємо до краю.
      const first = segments[0]
      const last = segments[segments.length - 1]
      if (day.isBefore(first.from, 'day')) return first.x
      if (day.isAfter(last.to, 'day')) return last.x + last.width

      for (const segment of segments) {
        if (day.isAfter(segment.to, 'day')) continue

        // Потрапила в розрив перед цим відрізком — прилипає до його початку.
        if (day.isBefore(segment.from, 'day')) return segment.x

        return segment.x + day.diff(dayjs(segment.from), 'day') * pxPerDay
      }

      return last.x + last.width
    }

    return {
      width,
      isEmpty: false,
      pxPerDay,
      segments,
      breaks,
      bounds,
      xOf,
      spanOf: (from, to) => {
        const x = xOf(from)
        const end = xOf(to ?? today.format(DAY))

        return { x, width: Math.max(MIN_SPAN_PX, end - x) }
      },
    }
  }
}
