// Назви місяців українською.
//
// Intl тут не годиться: `uk-UA` з `month: 'long'` разом із роком віддає родовий
// відмінок і суфікс «р.» («липня 2026 р.»), а підпис звіту й вісь смуги періодів
// потребують називного («Липень 2026»). Плюс локаль довелось би тягнути в бандл.
//
// Самі назви дає проєкт (`labels.monthNames`), ядро мови не знає.

import { SharedConfig } from '../config'

const names = () => SharedConfig.get().labels.monthNames
const shortNames = () => SharedConfig.get().labels.monthShortNames

/** `YYYY-MM` — формат місяця, яким оперує розділ виплат. */
const MONTH_KEY = /^(\d{4})-(0[1-9]|1[0-2])$/

export class MonthHelper {
  /** Повна назва в називному: «Липень». */
  static name(date: Date): string {
    return names()[date.getMonth()] ?? ''
  }

  /** Скорочення для осей і щільних місць: «лип». */
  static shortName(date: Date): string {
    return shortNames()[date.getMonth()] ?? ''
  }

  /**
   * `2026-07` → «Липень 2026». Некоректний ключ віддаємо як є: краще показати
   * сире значення, ніж мовчки підставити чужий місяць.
   */
  static label(month: string): string {
    const parsed = MONTH_KEY.exec(month)
    if (!parsed) return month

    const [, year, monthNumber] = parsed

    return `${names()[Number(monthNumber) - 1]} ${year}`
  }

  /** Дванадцять назв підряд, від січня, — для сітки вибору місяця. */
  static names(): readonly string[] {
    return names()
  }

  /** `2026-07` → рік і номер місяця. `null` — рядок не той. */
  static parse(month: string): { year: number; month: number } | null {
    const parsed = MONTH_KEY.exec(month)
    if (!parsed) return null

    return { year: Number(parsed[1]), month: Number(parsed[2]) }
  }

  /** Рік + номер місяця (1–12) → `2026-07`. */
  static key(year: number, month: number): string {
    return `${year}-${String(month).padStart(2, '0')}`
  }

  /** Чи схожий рядок на `YYYY-MM` — перевіряють і фільтр, і розбір адреси. */
  static isMonth(value: string): boolean {
    return MONTH_KEY.test(value)
  }
}
