// Форма проєкту: `useMyForm` + одна політика помилок сабміту.
//
// Колбек `handleSubmit` описує лише успішний шлях. Відмову бека віддаємо формі
// (422 → поля), а вікно лишається відкритим з набраним. Помилка поля — під полем,
// з фокусом і прокруткою до першого такого поля; помилка форми в цілому — тостом
// (`FormErrorScope`). Політика тут, а не try/catch у кожній модалці: там закрити
// вікно на помилці було одним рядком — і так губили введене.

import { nextTick } from 'vue'
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

  /**
   * Віддати помилку формі — для сабміту, що ловить її сам (повтор, плитки чеків).
   * `true` — уся відмова лягла в поля форми, тост не потрібен.
   */
  function showError(error: unknown): boolean {
    // Скасування (закрили діалог, без якого дію не виконати) — тихо стоїмо.
    if (error instanceof ActionCancelledError) return true
    // Не відповідь бека — баг у нашому коді: не ковтаємо, хай дійде до консолі.
    if (!(error instanceof AppError)) throw error

    const paths = errorPaths?.(form.fNames, form.values) ?? {}
    const fieldPaths = paths.fieldPaths ?? form.fieldPaths

    ApiErrorHelper.applyToForm(error, { setErrors: form.setErrors, fieldPaths }, paths.map)
    focusFirstError()

    return ApiErrorHelper.fitsForm(error, fieldPaths, paths.map)
  }

  function handleSubmit(fn: (values: z.infer<T>) => Promise<unknown>) {
    const run = vvHandleSubmit(
      (values) =>
        FormErrorScope.run(async (claim) => {
          try {
            await fn(values)
          } catch (error) {
            if (showError(error)) claim(error)
          }
        }),
      // Схема не пропустила — так само до першого поля з помилкою.
      () => focusFirstError(),
    )

    // Повторний Enter, поки йде перший запит, не шле другий.
    return (event?: Event) => (form.isSubmitting.value ? Promise.resolve() : run(event))
  }

  return { ...form, handleSubmit, showError }
}

/**
 * До першого поля з помилкою: прокрутити до нього й поставити фокус — людина одразу бачить,
 * що виправити. Форма — остання на сторінці (модалка поверх інших); помилку показує SmartField.
 */
function focusFirstError(): void {
  void nextTick(() => {
    const forms = document.querySelectorAll('form')
    const field = forms[forms.length - 1]?.querySelector('.ui-errors')?.closest('.smart-field, .segmented-control')
    if (!field) return

    field.scrollIntoView({ block: 'center', behavior: 'smooth' })
    field.querySelector<HTMLElement>('input, select, textarea, button')?.focus({ preventScroll: true })
  })
}

/** Повторюваний блок полів форми (інтервали дня, рядки чека). */
export function useAppFieldArray<TValue>(path: string) {
  return useFieldArray<TValue>(path)
}
