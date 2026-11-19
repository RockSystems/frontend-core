// Форма проєкту: `useMyForm` + одна політика помилок сабміту.
//
// Колбек `handleSubmit` описує лише успішний шлях. Відмову бека віддаємо формі
// (422 → поля), а вікно лишається відкритим з набраним. Помилка поля — лише під
// полем: поки сабміт іде, onError мутації її не тостить (`FormErrorScope`); помилку
// форми в цілому тостить. Політика тут, а не try/catch у кожній модалці: там закрити
// вікно на помилці було одним рядком — і так губили введене.

import { useFieldArray } from 'vee-validate'
import type { z } from 'zod'
import { AppError } from '../api/errors'
import { useMyForm, type UseMyFormConfig } from './useMyForm'
import type { PathInto } from '../helpers/form.helper'
import { ActionCancelledError } from '../errors/actionCancelled'
import { ApiErrorHelper } from '../errors/apiError.helper'
import { FormErrorScope } from '../errors/formErrorScope'

interface ErrorPaths {
  /** Поле бека → поле форми, лише для змістовних перейменувань (`payment_date` → «Дата»). */
  map?: Record<string, string>
  /** Поля форми, коли їх більше, ніж ключів схеми (рядки шкали `tiers[0].rate`). */
  fieldPaths?: readonly string[]
}

type AppFormConfig<T extends z.ZodTypeAny> = UseMyFormConfig<T> & {
  /** Рахується в момент помилки: шляхи можуть залежати від набраного. */
  errorPaths?: (fNames: PathInto<T>, values: z.infer<T>) => ErrorPaths
}

export function useAppForm<T extends z.ZodTypeAny>(schema: T, config: AppFormConfig<T>) {
  const { errorPaths, ...formConfig } = config
  const { handleSubmit: vvHandleSubmit, ...form } = useMyForm(schema, formConfig)

  /** Віддати помилку формі — для сабміту, що ловить її сам (повтор, плитки чеків). */
  function showError(error: unknown): void {
    // Скасування (закрили діалог, без якого дію не виконати) — тихо стоїмо.
    if (error instanceof ActionCancelledError) return
    // Не відповідь бека — баг у нашому коді: не ковтаємо, хай дійде до консолі.
    if (!(error instanceof AppError)) throw error

    const paths = errorPaths?.(form.fNames, form.values) ?? {}

    ApiErrorHelper.applyToForm(
      error,
      { setErrors: form.setErrors, fieldPaths: paths.fieldPaths ?? form.fieldPaths },
      paths.map,
    )
  }

  /** Відмова ляже вся в поля цієї форми — тоді її показує форма, а не тост. */
  function fitsForm(error: unknown): boolean {
    const paths = errorPaths?.(form.fNames, form.values) ?? {}
    return ApiErrorHelper.fitsForm(error, paths.fieldPaths ?? form.fieldPaths, paths.map)
  }

  function handleSubmit(fn: (values: z.infer<T>) => Promise<unknown>) {
    const run = vvHandleSubmit(async (values) => {
      try {
        await FormErrorScope.run(fitsForm, () => fn(values))
      } catch (error) {
        showError(error)
      }
    })

    // Повторний Enter, поки йде перший запит, не шле другий.
    return (event?: Event) => (form.isSubmitting.value ? Promise.resolve() : run(event))
  }

  return { ...form, handleSubmit, showError }
}

/** Повторюваний блок полів форми (інтервали дня, рядки чека). */
export function useAppFieldArray<TValue>(path: string) {
  return useFieldArray<TValue>(path)
}
