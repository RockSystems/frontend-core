// Гроші для людини, однаково в усіх проєктах:
// - немає значення (null, порожньо, не число) — «—»: даних немає;
// - справжній нуль — «0 ₴», без копійок: видно, що це нуль, а не пропуск;
// - решта завжди з копійками, «1 500,00 ₴», щоб числа в колонці стояли рівно.
// Сума приходить числом чи десятковим рядком (`"1500.00"`): рядок Intl форматує
// як є, без заокруглення через float.

import { NumberHelper, numericValue } from './number.helper'

const LOCALE = 'uk-UA'

type Amount = number | string | null | undefined

const formatters = new Map<string, Intl.NumberFormat>()

function formatter(currency: string | null, fractionDigits: 0 | 2): Intl.NumberFormat {
    const key = `${currency ?? ''}:${fractionDigits}`
    let value = formatters.get(key)
    if (!value) {
        value = new Intl.NumberFormat(LOCALE, {
            ...(currency ? { style: 'currency', currency, currencyDisplay: 'narrowSymbol' } : {}),
            minimumFractionDigits: fractionDigits,
            maximumFractionDigits: fractionDigits,
        })
        formatters.set(key, value)
    }
    return value
}

function render(amount: Amount, currency: string | null): string {
    const numeric = numericValue(amount)
    if (numeric === null) return '—'
    if (Number(numeric) === 0) return formatter(currency, 0).format(0)
    const value = typeof numeric === 'number' ? NumberHelper.round(numeric) : numeric
    return formatter(currency, 2).format(value as number)
}

export class MoneyHelper {
    /** 3274.34 -> "3 274,34 ₴", 0 -> "0 ₴", null -> «—». Валюта — код ISO: UAH, EUR, USD. */
    static format(amount: Amount, currency = 'UAH'): string {
        return render(amount, currency)
    }

    /** Те саме, але порожнє лишається `null`: KPI відрізняють «немає даних» від нуля. */
    static formatOrNull(amount: Amount, currency = 'UAH'): string | null {
        return numericValue(amount) === null ? null : render(amount, currency)
    }

    /**
     * Без символу валюти: "3 274,34". Для пари в одній комірці ("12 800,00 / 5 400,00 ₴"),
     * де символ ставиться раз у кінці. Одиночна сума — лише `format`.
     */
    static formatBare(amount: Amount): string {
        return render(amount, null)
    }
}
