import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '../../src/api/errors'
import { ApiProblemHelper } from '../../src/api/errors/apiProblem'
import { SharedConfig } from '../../src/config'
import { ActionCancelledError } from '../../src/errors/actionCancelled'
import { ApiErrorHelper } from '../../src/errors/apiError.helper'
import { FormErrorScope } from '../../src/errors/formErrorScope'
import { handleApiError } from '../../src/errors/useHandleError'

const notifyError = vi.fn()

function configure(errors: Record<string, unknown> = {}): void {
  SharedConfig.configure({
    notifyError,
    errors: {
      codes: {
        VALIDATION_FAILED: 'check the fields',
        FORBIDDEN: 'no rights',
        NOT_ENOUGH: (meta: { left: number }) => `left ${meta.left}`,
      },
      byStatus: { 0: 'no network', 404: 'not found' },
      serverError: 'server broke',
      timeout: 'too slow',
      fallback: 'something went wrong',
      rule: (entry: { field?: string }) => `rule for ${entry.field ?? 'nothing'}`,
      ...errors,
    },
  } as never)
}

function apiError(status: number, body: unknown): AppError {
  const error = new AppError(status, 'http error')
  error.problem = ApiProblemHelper.parse(body, status)

  return error
}

const validation = (field: string) => ({ code: 'VALIDATION_FAILED', field, meta: { rule: 'required' } })

beforeEach(() => {
  notifyError.mockClear()
  configure()
})

describe('ApiErrorHelper.message', () => {
  it('walks the fallback chain', () => {
    expect(ApiErrorHelper.message(new Error('bug'))).toBe('something went wrong')

    const timeout = new AppError(0, 'timeout')
    timeout.isTimeout = true
    expect(ApiErrorHelper.message(timeout)).toBe('too slow')

    expect(ApiErrorHelper.message(new AppError(0, 'network'))).toBe('no network')
    expect(ApiErrorHelper.message(new AppError(404, 'html'))).toBe('not found')
    expect(ApiErrorHelper.message(new AppError(503, 'html'))).toBe('server broke')
    expect(ApiErrorHelper.message(new AppError(418, 'html'))).toBe('something went wrong')
  })

  it('uses the code text, with meta when the text needs it', () => {
    const error = apiError(403, { code: 'FORBIDDEN', errors: [{ code: 'NOT_ENOUGH', meta: { left: 3 } }] })

    expect(ApiErrorHelper.message(error)).toBe('left 3')
  })

  it('falls back to the category when the entry code is unknown', () => {
    const error = apiError(403, { code: 'FORBIDDEN', errors: [{ code: 'NEW_CODE' }] })

    expect(ApiErrorHelper.message(error)).toBe('no rights')
  })

  it('explains a lone validation entry by its rule, several entries by the category', () => {
    expect(ApiErrorHelper.message(apiError(422, { code: 'VALIDATION_FAILED', errors: [validation('name')] })))
      .toBe('rule for name')
    expect(ApiErrorHelper.message(apiError(422, { code: 'VALIDATION_FAILED', errors: [validation('name'), validation('age')] })))
      .toBe('check the fields')
  })

  it('prefers an application code over a validation entry that comes first', () => {
    const error = apiError(422, {
      code: 'VALIDATION_FAILED',
      errors: [validation('name'), { code: 'NOT_ENOUGH', meta: { left: 1 } }],
    })

    expect(ApiErrorHelper.message(error)).toBe('left 1')
  })

  it('shows detail only when the project asks for it', () => {
    const body = { code: 'SOME_OWN_CODE', detail: 'human reason', errors: [] }

    expect(ApiErrorHelper.message(apiError(418, body))).toBe('something went wrong')

    configure({ showDetail: true })
    expect(ApiErrorHelper.message(apiError(418, body))).toBe('human reason')
  })

  it('ignores a body that is not ours', () => {
    const laravelDefault = { message: 'The name field is required.', errors: { name: ['required'] } }

    expect(ApiErrorHelper.message(apiError(404, laravelDefault))).toBe('not found')
  })
})

describe('ApiErrorHelper.applyToForm', () => {
  const body = { code: 'VALIDATION_FAILED', errors: [validation('license_plate'), validation('payment_date'), validation('gone')] }

  it('maps fields: exact, camelCase, map, and warns about the rest', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const setErrors = vi.fn()

    const result = ApiErrorHelper.applyToForm(
      apiError(422, body),
      { setErrors, fieldPaths: ['licensePlate', 'month'] },
      { payment_date: 'month' },
    )

    expect(result).toBe(true)
    expect(setErrors).toHaveBeenCalledWith({
      licensePlate: 'rule for license_plate',
      month: 'rule for payment_date',
    })
    expect(warn).toHaveBeenCalledWith(expect.any(String), ['gone'])
    warn.mockRestore()
  })

  it('does nothing for anything but 422', () => {
    const setErrors = vi.fn()

    expect(ApiErrorHelper.applyToForm(new AppError(500, 'x'), { setErrors, fieldPaths: [] })).toBe(false)
    expect(setErrors).not.toHaveBeenCalled()
  })

  it('takes project rules: a field resolver and an entry that names several fields', () => {
    configure({
      resolveField: (path: string) => (path === 'price.amount' ? 'price' : undefined),
      fieldsOf: (entry: { code: string; field?: string; meta?: { missing?: string[] } }) =>
        entry.field ? [entry.field] : entry.meta?.missing ?? [],
    })
    const setErrors = vi.fn()

    ApiErrorHelper.applyToForm(
      apiError(422, {
        code: 'VALIDATION_FAILED',
        errors: [validation('price.amount'), { code: 'NOT_ENOUGH', meta: { left: 0, missing: ['a', 'b'] } }],
      }),
      { setErrors, fieldPaths: ['price', 'a', 'b'] },
    )

    expect(setErrors).toHaveBeenCalledWith({ price: 'rule for price.amount', a: 'left 0', b: 'left 0' })
  })
})

describe('handleApiError', () => {
  it('stays silent when the person cancelled', () => {
    handleApiError(new ActionCancelledError())

    expect(notifyError).not.toHaveBeenCalled()
  })

  it('marks an expired session and gives the same error the same id', () => {
    handleApiError(new AppError(419, 'x'))
    handleApiError(new AppError(419, 'x'))

    const [first, second] = notifyError.mock.calls
    expect(first[1].isSessionExpired).toBe(true)
    expect(first[1].id).toBe(second[1].id)
  })

  it('logs a bug of our own and still tells the person', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})

    handleApiError(new Error('bug'))

    expect(log).toHaveBeenCalled()
    expect(notifyError).toHaveBeenCalledWith('something went wrong', expect.objectContaining({ isSessionExpired: false }))
    log.mockRestore()
  })
})

describe('form errors: a field error under the field, a form error in a toast', () => {
  const fields = ['name', 'payment_date', 'month']
  const fits = (error: unknown) => ApiErrorHelper.fitsForm(error, fields)

  it('skips the toast while a form shows every entry under its fields', async () => {
    const error = apiError(422, { code: 'VALIDATION_FAILED', errors: [validation('name'), validation('payment_date')] })

    await FormErrorScope.run(fits, async () => handleApiError(error))

    expect(notifyError).not.toHaveBeenCalled()
  })

  it('toasts an entry that has no field or a field the form does not have', async () => {
    const formWide = apiError(422, { code: 'BUSINESS_RULE_VIOLATION', errors: [{ code: 'NOT_ENOUGH', meta: { left: 1 } }] })
    const unknownField = apiError(422, { code: 'VALIDATION_FAILED', errors: [validation('name'), validation('vin')] })

    await FormErrorScope.run(fits, async () => {
      handleApiError(formWide)
      handleApiError(unknownField)
    })

    expect(notifyError).toHaveBeenCalledTimes(2)
  })

  it('toasts field errors again once the form is not submitting', () => {
    handleApiError(apiError(422, { code: 'VALIDATION_FAILED', errors: [validation('name')] }))

    expect(notifyError).toHaveBeenCalledTimes(1)
  })
})
