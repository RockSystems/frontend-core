// Помилка API → текст людині й помилки по полях форми.
//
// Ланцюг логіки однаковий у всіх проєктах і живе тут, а самі тексти дає проєкт
// (`SharedConfig.errors`): коди в кожного свої, бек тексти не шле.
//
// Ланцюг запасних варіантів:
//   1. код є в словнику → текст проєкту (з `meta`, якщо він її вживає);
//   2. коду немає (бек завів новий, збірка стара) → текст за HTTP-статусом;
//   3. тіло взагалі не наше (проксі, обрив) → загальний текст.

import { AppError } from '../api/errors'
import { type ApiProblem, ApiProblemHelper } from '../api/errors/apiProblem'
import { SharedConfig } from '../config'

const VALIDATION_FAILED = 'VALIDATION_FAILED'

/** Зріз форми, потрібний роздачі помилок. Дає `useMyForm`. */
export interface FormErrorTarget {
  setErrors: (fields: Record<string, string>) => void
  fieldPaths: readonly string[]
}

const texts = () => SharedConfig.get().errors

export class ApiErrorHelper {
  /**
   * `meta` запису саме цього коду, або `null`, коли відмова інша.
   * Для кодів, на які фронт реагує, а не лише показує текст. Типи кодів знає проєкт.
   */
  static metaOf<TMeta = unknown>(error: unknown, code: string): TMeta | null {
    if (!(error instanceof AppError) || error.problem === null) return null

    const entry = error.problem.errors.find(item => item.code === code)

    return entry === undefined ? null : (entry.meta as TMeta)
  }

  /**
   * Текст користувачу за будь-якою помилкою. Приймає саму помилку, а не `problem`:
   * коли тіло не наше, підпис усе одно є, за статусом. Не `error.message`: там англійська.
   */
  static message(error: unknown): string {
    const { fallback, timeout, byStatus, serverError } = texts()

    if (!(error instanceof AppError)) return fallback
    if (error.isTimeout) return timeout

    return ApiErrorHelper.byProblem(error.problem)
      ?? byStatus[error.status]
      ?? (error.status >= 500 ? serverError : fallback)
  }

  /** Сесія скінчилась: людині є що зробити, увійти знову. */
  static isSessionExpired(error: unknown): boolean {
    return error instanceof AppError && (error.status === 401 || error.status === 419)
  }

  /**
   * Найточніший підпис із тіла: код запису → код категорії.
   *
   * Єдиний запис валідації — текст за його правилом: без форми він сам пояснює
   * відмову, а словник дав би «Перевірте заповнені поля» там, де полів немає.
   */
  private static byProblem(problem: ApiProblem | null): string | undefined {
    if (problem === null) return undefined

    const { rule, showDetail } = texts()
    // Прикладний код точніший за запис валідації, навіть якщо стоїть не першим.
    const entry = problem.errors.find(item => item.code !== VALIDATION_FAILED) ?? ApiProblemHelper.primary(problem)

    if (entry?.code === VALIDATION_FAILED && problem.errors.length === 1) return rule(entry)

    return ApiErrorHelper.textFor(entry?.code, entry?.meta)
      ?? ApiErrorHelper.textFor(problem.code, undefined)
      ?? (showDetail ? problem.detail : undefined)
  }

  /** Помилки полів: `{ шлях поля → текст }`, у такому вигляді їх приймає `setErrors` vee-validate. */
  private static fieldErrors(problem: ApiProblem | null): Record<string, string> {
    if (problem === null) return {}

    const { rule, fallback, fieldsOf } = texts()
    const result: Record<string, string> = {}

    for (const entry of problem.errors) {
      const fields = fieldsOf?.(entry) ?? (entry.field === undefined ? [] : [entry.field])

      for (const field of fields) {
        if (field in result) continue

        result[field] = entry.code === VALIDATION_FAILED
          ? rule({ ...entry, field })
          : ApiErrorHelper.textFor(entry.code, entry.meta) ?? fallback
      }
    }

    return result
  }

  /** Помилки 422 за шляхом поля запиту: для списків, яких немає серед полів форми. */
  static fieldErrorsOf(error: unknown): Record<string, string> {
    return error instanceof AppError && error.status === 422
      ? ApiErrorHelper.fieldErrors(error.problem)
      : {}
  }

  /**
   * Віддати помилку 422 полям форми: `true` — вона лягла у форму.
   *
   * Модалку з формою при помилці НЕ закриваємо: відмову виправляють тут же, набране
   * не має зникати разом із вікном. Помилка поля — лише під полем: тост `handleApiError`
   * пропускає (`fitsForm` + `FormErrorScope`); помилку форми в цілому показує тост.
   *
   * Поля бека — імена запиту (`payment_date`), у форми свої (`month`). Шлях перекладається:
   * точний збіг → camelCase → `map` → `SharedConfig.errors.resolveField`.
   *
   * @param form `setErrors` + `fieldPaths` з `useMyForm`
   * @param map  поле бека → поле форми, лише для змістовних перейменувань
   */
  static applyToForm(error: unknown, form: FormErrorTarget, map: Record<string, string> = {}): boolean {
    if (!(error instanceof AppError) || error.status !== 422) return false

    const fields: Record<string, string> = {}
    const unknownPaths: string[] = []

    for (const [path, text] of Object.entries(ApiErrorHelper.fieldErrors(error.problem))) {
      const formPath = ApiErrorHelper.formPath(path, form.fieldPaths, map)

      if (formPath === undefined) unknownPaths.push(path)
      else if (!(formPath in fields)) fields[formPath] = text
    }

    if (Object.keys(fields).length > 0) form.setErrors(fields)

    // Такий запис тостить onError (fitsForm — ні); тут підказка розробнику, чого бракує в `map`.
    if (unknownPaths.length > 0) console.warn('[api] field errors with no form field:', unknownPaths)

    return true
  }

  /**
   * Уся відмова лягає в поля форми: кожен запис 422 має поле, і воно є у формі.
   * Тоді текст — під полями, тост не потрібен. Запис без поля (бізнес-правило форми
   * в цілому) чи з полем, якого у формі немає, — помилка форми, її показує тост.
   */
  static fitsForm(error: unknown, fieldPaths: readonly string[], map: Record<string, string> = {}): boolean {
    if (!(error instanceof AppError) || error.status !== 422 || error.problem === null) return false

    const { fieldsOf } = texts()
    const { errors } = error.problem

    return errors.length > 0 && errors.every((entry) => {
      const fields = fieldsOf?.(entry) ?? (entry.field === undefined ? [] : [entry.field])

      return fields.length > 0
        && fields.every(field => ApiErrorHelper.formPath(field, fieldPaths, map) !== undefined)
    })
  }

  /** `undefined` — такого поля у формі немає. */
  private static formPath(path: string, fieldPaths: readonly string[], map: Record<string, string>): string | undefined {
    const candidates = [path, ApiErrorHelper.toCamel(path), map[path], texts().resolveField?.(path, fieldPaths)]

    return candidates.find((candidate): candidate is string =>
      candidate !== undefined && fieldPaths.includes(candidate))
  }

  /** `license_plate` → `licensePlate`: більшість розбіжностей рівно така. */
  private static toCamel(path: string): string {
    return path.replace(/_([a-z0-9])/gu, (_, char: string) => char.toUpperCase())
  }

  /** `undefined` — коду немає в словнику: запасний варіант обирає той, хто знає контекст. */
  private static textFor(code: string | undefined, meta: unknown): string | undefined {
    if (code === undefined) return undefined

    const text = texts().codes[code]

    return typeof text === 'function' ? text(meta) : text
  }
}
