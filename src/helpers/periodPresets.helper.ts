// Набори пресетів («швидкий вибір») для DateRangeField. Окремо від режиму снапу:
// фіча дає свій набір (звіти: вільний діапазон, пресети тиждень/місяць/квартал/рік).
//
// Вбудований пресет відносний: період несе його код (`preset`), і в адресі та
// збереженому вигляді лежить код, а не дати. «Поточний місяць», збережений у
// листопаді, у грудні відкриється груднем; конкретні дати лишаються датами.

import { SharedConfig } from '../config'
import { PeriodHelper, type Period } from './period.helper'

/** Як рахувати кожен вбудований пресет; ключ — і код в адресі, і ключ підпису. */
const RELATIVE = {
  today: () => PeriodHelper.today(),
  yesterday: () => PeriodHelper.yesterday(),
  thisWeek: () => PeriodHelper.currentWeek(),
  prevWeek: () => PeriodHelper.prevWeek(),
  last2Weeks: () => PeriodHelper.lastNWeeks(2),
  last4Weeks: () => PeriodHelper.lastNWeeks(4),
  thisMonth: () => PeriodHelper.currentMonth(),
  prevMonth: () => PeriodHelper.prevMonth(),
  thisQuarter: () => PeriodHelper.currentQuarter(),
  prevQuarter: () => PeriodHelper.prevQuarter(),
  thisYear: () => PeriodHelper.currentYear(),
  prevYear: () => PeriodHelper.prevYear(),
  last30Days: () => PeriodHelper.lastNDays(30),
  last90Days: () => PeriodHelper.lastNDays(90),
} as const satisfies Record<string, () => Period>

/** Код відносного пресету: `range=thisMonth` в адресі. */
export type PeriodPresetId = keyof typeof RELATIVE

export interface PeriodPreset {
  label: string
  make: () => Period
}

export type PeriodPresetGroups = PeriodPreset[][]

const texts = () => SharedConfig.get().labels.periodPresets

/** Вбудований пресет: дати рахуються в момент вибору, а період памʼятає код. */
function relative(id: PeriodPresetId): PeriodPreset {
  return { label: texts()[id], make: () => PeriodPresetsHelper.resolve(id) }
}

export class PeriodPresetsHelper {
  /** Код із адреси чи збереженого вигляду; чужий рядок — не пресет. */
  static isId(raw: string): raw is PeriodPresetId {
    return Object.hasOwn(RELATIVE, raw)
  }

  /** Дати пресету на сьогодні разом із його кодом. */
  static resolve(id: PeriodPresetId): Period {
    return { ...RELATIVE[id](), preset: id }
  }

  // Повний набір для вільного діапазону (статистика/платежі).
  static day(): PeriodPresetGroups {
    return [
      [relative('today'), relative('yesterday')],
      [relative('thisWeek'), relative('prevWeek')],
      [relative('thisMonth'), relative('prevMonth')],
      [relative('last30Days'), relative('last90Days')],
    ]
  }

  // Тижневий снап (лишається для сумісності mode='week').
  static week(): PeriodPresetGroups {
    return [
      [relative('thisWeek'), relative('prevWeek'), relative('last2Weeks'), relative('last4Weeks')],
      [relative('thisMonth'), relative('prevMonth')],
    ]
  }

  // Звіти: тиждень / місяць / квартал / рік (менеджерські «швидкі вибори»).
  static reports(): PeriodPresetGroups {
    return [
      [relative('thisWeek'), relative('prevWeek')],
      [relative('thisMonth'), relative('prevMonth')],
      [relative('thisQuarter'), relative('prevQuarter')],
      [relative('thisYear'), relative('prevYear')],
    ]
  }
}
