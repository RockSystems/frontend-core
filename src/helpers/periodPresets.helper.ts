// Набори пресетів («швидкий вибір») для DateRangeField. Окремо від режиму снапу:
// фіча дає свій набір (звіти: вільний діапазон, пресети тиждень/місяць/квартал/рік).

import { SharedConfig } from '../config'
import { PeriodHelper, type Period } from './period.helper'

export interface PeriodPreset {
  label: string
  make: () => Period
}

export type PeriodPresetGroups = PeriodPreset[][]

const texts = () => SharedConfig.get().labels.periodPresets

export class PeriodPresetsHelper {
  // Повний набір для вільного діапазону (статистика/платежі).
  static day(): PeriodPresetGroups {
    return [
      [
        { label: texts().today, make: () => PeriodHelper.today() },
        { label: texts().yesterday, make: () => PeriodHelper.yesterday() },
      ],
      [
        { label: texts().thisWeek, make: () => PeriodHelper.currentWeek() },
        { label: texts().prevWeek, make: () => PeriodHelper.prevWeek() },
      ],
      [
        { label: texts().thisMonth, make: () => PeriodHelper.currentMonth() },
        { label: texts().prevMonth, make: () => PeriodHelper.prevMonth() },
      ],
      [
        { label: texts().last30Days, make: () => PeriodHelper.lastNDays(30) },
        { label: texts().last90Days, make: () => PeriodHelper.lastNDays(90) },
      ],
    ]
  }

  // Тижневий снап (лишається для сумісності mode='week').
  static week(): PeriodPresetGroups {
    return [
      [
        { label: texts().thisWeek, make: () => PeriodHelper.currentWeek() },
        { label: texts().prevWeek, make: () => PeriodHelper.prevWeek() },
        { label: texts().last2Weeks, make: () => PeriodHelper.lastNWeeks(2) },
        { label: texts().last4Weeks, make: () => PeriodHelper.lastNWeeks(4) },
      ],
      [
        { label: texts().thisMonth, make: () => PeriodHelper.currentMonth() },
        { label: texts().prevMonth, make: () => PeriodHelper.prevMonth() },
      ],
    ]
  }

  // Звіти: тиждень / місяць / квартал / рік (менеджерські «швидкі вибори»).
  static reports(): PeriodPresetGroups {
    return [
      [
        { label: texts().thisWeek, make: () => PeriodHelper.currentWeek() },
        { label: texts().prevWeek, make: () => PeriodHelper.prevWeek() },
      ],
      [
        { label: texts().thisMonth, make: () => PeriodHelper.currentMonth() },
        { label: texts().prevMonth, make: () => PeriodHelper.prevMonth() },
      ],
      [
        { label: texts().thisQuarter, make: () => PeriodHelper.currentQuarter() },
        { label: texts().prevQuarter, make: () => PeriodHelper.prevQuarter() },
      ],
      [
        { label: texts().thisYear, make: () => PeriodHelper.currentYear() },
        { label: texts().prevYear, make: () => PeriodHelper.prevYear() },
      ],
    ]
  }
}
