import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { SharedConfig } from '../../src/config'
import { PeriodLabelHelper } from '../../src/helpers/periodLabel.helper'
import type { UrlReader } from '../../src/helpers/urlState.helper'
import { UrlParamsHelper } from '../../src/helpers/urlParams.helper'

function reader(query: Record<string, string>): UrlReader {
  return {
    get: key => query[key] ?? null,
    getList: key => (query[key] ? query[key].split(',') : []),
  }
}

// Адресу править хто завгодно: сміття має ставати дефолтом, а не 422 від бека.
describe('UrlParamsHelper', () => {
  it('reads a real period', () => {
    expect(UrlParamsHelper.period(reader({ from: '2026-02-01', to: '2026-02-28' }))).toEqual({ from: '2026-02-01', to: '2026-02-28' })
    expect(UrlParamsHelper.period(reader({ from: '2026-02-01', to: '2026-02-01' }))).toEqual({ from: '2026-02-01', to: '2026-02-01' })
  })

  it.each([
    ['half of a range', { from: '2026-02-01' }],
    ['a day that does not exist', { from: '2026-02-01', to: '2026-02-31' }],
    ['a reversed range', { from: '2026-05-10', to: '2026-05-01' }],
    ['a broken format', { from: '01.02.2026', to: '2026-02-28' }],
  ])('drops %s', (_, query) => {
    expect(UrlParamsHelper.period(reader(query))).toBeNull()
  })

  it('keeps leap days only in leap years', () => {
    expect(UrlParamsHelper.isoDate('2028-02-29')).toBe('2028-02-29')
    expect(UrlParamsHelper.isoDate('2026-02-29')).toBeNull()
    expect(UrlParamsHelper.isoDate('2026-13-01')).toBeNull()
  })

  it.each([
    ['3', 3],
    ['1', 1],
    ['2.5', 1],
    ['-4', 1],
    ['abc', 1],
    [null, 1],
  ])('reads page %s as %s', (raw, page) => {
    expect(UrlParamsHelper.page(raw)).toBe(page)
  })
})

describe('PeriodLabelHelper', () => {
  const zone = process.env.TZ

  beforeAll(() => { process.env.TZ = 'America/New_York' })
  afterAll(() => { process.env.TZ = zone })

  it('labels the days of the range whatever the machine time zone', () => {
    SharedConfig.configure({
      labels: { dateLocale: 'en-GB', rangeYearSuffix: /$^/ },
    } as never)

    // Північ UTC — у поясі західніше UTC це ще попередній день; підпис не має з'їжджати.
    expect(PeriodLabelHelper.range('2026-02-02', '2026-02-08')).toMatch(/^2\D+8 Feb 2026$/)
  })
})
