import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PeriodHelper } from '../../src/helpers/period.helper'
import { PeriodPresetsHelper } from '../../src/helpers/periodPresets.helper'
import type { UrlReader } from '../../src/helpers/urlState.helper'
import { UrlSchemaHelper } from '../../src/helpers/urlSchema.helper'

function reader(query: Record<string, string>): UrlReader {
  return {
    get: key => query[key] ?? null,
    getList: key => (query[key] ? query[key].split(',') : []),
  }
}

// Відносний період у посиланні й збереженому вигляді має їхати з календарем.
describe('UrlSchemaHelper.period with a preset', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 11, 3, 12))
  })
  afterEach(() => { vi.useRealTimers() })

  const codec = UrlSchemaHelper.period()

  it('writes the preset code instead of the dates', () => {
    expect(codec.write({ from: '2026-11-01', to: '2026-11-30', preset: 'thisMonth' }))
      .toEqual({ range: 'thisMonth', from: null, to: null })
  })

  it('writes plain dates and drops a stale code', () => {
    expect(codec.write({ from: '2026-11-01', to: '2026-11-30' }))
      .toEqual({ range: null, from: '2026-11-01', to: '2026-11-30' })
  })

  it('reads the code as the dates of today', () => {
    expect(codec.read(reader({ range: 'thisMonth' })))
      .toEqual({ from: '2026-12-01', to: '2026-12-31', preset: 'thisMonth' })
  })

  it('falls back to the dates when the code is unknown', () => {
    expect(codec.read(reader({ range: 'nextCentury', from: '2026-11-01', to: '2026-11-30' })))
      .toEqual({ from: '2026-11-01', to: '2026-11-30' })
    expect(codec.read(reader({ range: 'toString' }))).toBeNull()
  })

  it('resolves every built-in preset with its code', () => {
    expect(PeriodPresetsHelper.resolve('prevWeek')).toEqual({ ...PeriodHelper.prevWeek(), preset: 'prevWeek' })
    expect(PeriodPresetsHelper.isId('last30Days')).toBe(true)
    expect(PeriodPresetsHelper.isId('constructor')).toBe(false)
  })
})

describe('UrlSchemaHelper.create keys', () => {
  it('lists every address key the schema owns', () => {
    const schema = UrlSchemaHelper.create({
      period: UrlSchemaHelper.period(),
      search: UrlSchemaHelper.text('q'),
      ...UrlSchemaHelper.managersInOneKey('mgr'),
      page: UrlSchemaHelper.page(),
    })

    expect([...schema.keys].sort()).toEqual(['from', 'mgr', 'page', 'q', 'range', 'to'])
  })
})
