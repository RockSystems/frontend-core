import { describe, expect, it } from 'vitest'
import { MoneyHelper } from '../../src/helpers/money.helper'
import { NumberHelper } from '../../src/helpers/number.helper'

// Intl ставить нерозривні пробіли; у тестах порівнюємо зі звичайними.
const plain = (value: string | null) => value?.replace(/[  ]/g, ' ') ?? null

describe('MoneyHelper.format', () => {
  it('порожнє й нечислове — прочерк', () => {
    for (const value of [null, undefined, '', '  ', 'abc', Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(MoneyHelper.format(value)).toBe('—')
    }
  })

  it('нуль без копійок, і числом, і рядком', () => {
    expect(plain(MoneyHelper.format(0))).toBe('0 ₴')
    expect(plain(MoneyHelper.format('0.00'))).toBe('0 ₴')
    expect(plain(MoneyHelper.format(-0))).toBe('0 ₴')
  })

  it('решта з копійками', () => {
    expect(plain(MoneyHelper.format(3274.34))).toBe('3 274,34 ₴')
    expect(plain(MoneyHelper.format(1500))).toBe('1 500,00 ₴')
    expect(plain(MoneyHelper.format(-61509.78))).toBe('-61 509,78 ₴')
    expect(plain(MoneyHelper.format(0.005))).toBe('0,01 ₴')
  })

  it('рядок з бека без втрат точності', () => {
    expect(plain(MoneyHelper.format('1500.00'))).toBe('1 500,00 ₴')
    expect(plain(MoneyHelper.format('12345678901234.57'))).toBe('12 345 678 901 234,57 ₴')
  })

  it('інша валюта', () => {
    expect(plain(MoneyHelper.format(10, 'EUR'))).toBe('10,00 €')
  })

  it('formatOrNull і formatBare', () => {
    expect(MoneyHelper.formatOrNull(null)).toBeNull()
    expect(plain(MoneyHelper.formatOrNull(0))).toBe('0 ₴')
    expect(plain(MoneyHelper.formatBare(12800))).toBe('12 800,00')
    expect(plain(MoneyHelper.formatBare(0))).toBe('0')
    expect(MoneyHelper.formatBare(null)).toBe('—')
  })
})

describe('NumberHelper', () => {
  it('format: розряди, рядок, порожнє', () => {
    expect(plain(NumberHelper.format(1482))).toBe('1 482')
    expect(plain(NumberHelper.format('1500.5'))).toBe('1 500,5')
    expect(plain(NumberHelper.format(12.3456, 2))).toBe('12,35')
    expect(NumberHelper.format(null)).toBe('—')
    expect(NumberHelper.formatOrNull('')).toBeNull()
  })

  it('percent, rate, plural, parseDecimal', () => {
    expect(NumberHelper.percent(12.34)).toBe('12,3%')
    expect(NumberHelper.rate(0.4725)).toBe('47,25%')
    expect(NumberHelper.plural(3, ['день', 'дні', 'днів'])).toBe('3 дні')
    expect(NumberHelper.parseDecimal('1 234,5')).toBe(1234.5)
    expect(NumberHelper.parseDecimal('x')).toBe(0)
  })
})
