import { beforeEach, describe, expect, it, vi } from 'vitest'

// Поля таблиць оголошують на рівні модуля, а `SharedConfig.configure` викликається пізніше.
// Якщо ядро прочитає тексти під час імпорту, застосунок впаде на старті, а збірка цього не побачить.

const labels = {
  sortDirections: {
    numeric: { asc: 'up', desc: 'down' },
    text: { asc: 'a-z', desc: 'z-a' },
    date: { asc: 'old', desc: 'new' },
    group: { asc: 'direct', desc: 'reverse' },
  },
}

beforeEach(() => {
  vi.resetModules()
})

describe('reading the config', () => {
  it('importing helpers and declaring table fields does not need the config yet', async () => {
    const { TableFieldsHelper } = await import('../../src/helpers/tableFields.helper')
    await import('../../src/helpers/month.helper')
    await import('../../src/helpers/periodLabel.helper')
    await import('../../src/helpers/periodPresets.helper')
    await import('../../src/helpers/sort.helper')
    await import('../../src/errors/apiError.helper')
    await import('../../src/errors/useHandleError')

    const fields = TableFieldsHelper.create<'amount' | 'name'>()(s => ({
      amount: { header: 'Amount', sort: s.num('amount') },
      name: { header: 'Name', sort: s.text('name') },
    }))

    expect(fields.sortKeys).toEqual(['amount', 'name'])
  })

  it('table fields read the direction labels once the config is there', async () => {
    const { TableFieldsHelper } = await import('../../src/helpers/tableFields.helper')
    const { SharedConfig } = await import('../../src/config')

    const fields = TableFieldsHelper.create<'amount'>()(s => ({
      amount: { header: 'Amount', sort: s.num('amount') },
    }))

    SharedConfig.configure({ labels } as never)

    expect(fields.sortOptions[0].directions).toEqual(labels.sortDirections.numeric)
  })
})
