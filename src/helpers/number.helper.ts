// Числа для людини: розряди пробілом, кома, слово в правильній формі. Локаль
// одна на всі проєкти — українська.

const LOCALE = 'uk-UA'

const pluralRules = new Intl.PluralRules(LOCALE)
const percentFormatter = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const formatters = new Map<number | undefined, Intl.NumberFormat>()

function formatter(maximumFractionDigits?: number): Intl.NumberFormat {
    let value = formatters.get(maximumFractionDigits)
    if (!value) {
        value = new Intl.NumberFormat(LOCALE, maximumFractionDigits === undefined ? {} : { maximumFractionDigits })
        formatters.set(maximumFractionDigits, value)
    }
    return value
}

/** Число з бека: число чи десятковий рядок (`"1500.00"`). Порожнє й нечислове — `null`. */
export function numericValue(value: number | string | null | undefined): number | string | null {
    if (value === null || value === undefined) return null
    if (typeof value === 'number') return Number.isFinite(value) ? value : null
    const trimmed = value.trim()
    return trimmed !== '' && Number.isFinite(Number(trimmed)) ? trimmed : null
}

export class NumberHelper {
    /**
     * Розряди пробілом: 1482 -> "1 482". Рядок з бека (`"1500.50"`) Intl бере як є,
     * без заокруглення через float. Порожнє й нечислове — «—».
     */
    static format(value: number | string | null | undefined, maximumFractionDigits?: number): string {
        const numeric = numericValue(value)
        if (numeric === null) return '—'
        return formatter(maximumFractionDigits).format(numeric as number)
    }

    /** Те саме, але порожнє лишається `null`: KPI відрізняють «немає даних» від нуля. */
    static formatOrNull(value: number | string | null | undefined, maximumFractionDigits?: number): string | null {
        return numericValue(value) === null ? null : NumberHelper.format(value, maximumFractionDigits)
    }

    /** Частка у відсотках з однією десятою: 12.34 -> "12,3%". */
    static percent(value: number): string {
        return `${percentFormatter.format(value)}%`
    }

    /** Ставка дробом (як шле бек) у відсотках, до сотих: 0.14 -> "14%", 0.4725 -> "47,25%". */
    static rate(fraction: number): string {
        return `${NumberHelper.format(NumberHelper.round(fraction * 100))}%`
    }

    /** Число зі словом у правильній формі: 1 день, 3 дні, 5 днів. Форми — [одна, кілька, багато]. */
    static plural(value: number, forms: readonly [one: string, few: string, many: string]): string {
        const rule = pluralRules.select(value)
        const word = rule === 'one' ? forms[0] : rule === 'few' ? forms[1] : forms[2]
        return `${NumberHelper.format(value)} ${word}`
    }

    /** До двох знаків: 0.1 + 0.2 -> 0.3. */
    static round(value: number): number {
        return Math.round((value + Number.EPSILON) * 100) / 100
    }

    /** Введення людини: кома чи крапка, пробіли між розрядами. Порожнє й нечислове — 0. */
    static parseDecimal(raw: string | number | null | undefined): number {
        if (raw === null || raw === undefined || raw === '') return 0
        if (typeof raw === 'number') return Number.isFinite(raw) ? raw : 0
        const num = Number(String(raw).replace(/\s/g, '').replace(',', '.'))
        return Number.isFinite(num) ? num : 0
    }
}
