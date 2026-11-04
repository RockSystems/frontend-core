import { describe, expect, it } from 'vitest'
import { FileHelper } from '../../src/helpers/file.helper'

const file = (name: string, type = '') => new File(['x'], name, { type })

describe('FileHelper.isAccepted', () => {
  it('без accept бере будь-який файл', () => {
    expect(FileHelper.isAccepted(file('a.pdf'))).toBe(true)
    expect(FileHelper.isAccepted(file('a.pdf'), ' , ')).toBe(true)
  })

  it('розширення без огляду на регістр і пробіли', () => {
    expect(FileHelper.isAccepted(file('Report.XLSX'), '.csv, .xlsx')).toBe(true)
    expect(FileHelper.isAccepted(file('report.csv'), '.csv,.xlsx')).toBe(true)
    expect(FileHelper.isAccepted(file('report.pdf'), '.csv,.xlsx')).toBe(false)
    expect(FileHelper.isAccepted(file('report.xlsx.pdf'), '.xlsx')).toBe(false)
  })

  it('група і точний тип', () => {
    expect(FileHelper.isAccepted(file('a.png', 'image/png'), 'image/*')).toBe(true)
    expect(FileHelper.isAccepted(file('a.pdf', 'application/pdf'), 'image/*')).toBe(false)
    expect(FileHelper.isAccepted(file('a.pdf', 'application/pdf'), 'application/pdf')).toBe(true)
    expect(FileHelper.isAccepted(file('a', ''), 'application/pdf')).toBe(false)
  })
})
