// Розбір тіла помилки API у структуру. Контракт — `docs/api-error-contract.md`.
//
// Тут ТІЛЬКИ форма, без жодного слова українською: підписи за кодом дає словник
// у `shared/errors` (він знає домен і мову), а цей шар лишається придатним для
// іншого проєкту.

export interface ApiProblemEntry {
  /** Машинний код порушення: за ним клієнт бере текст і логіку. */
  code: string
  /** Шлях поля форми. Немає — помилка не про поле. */
  field?: string
  /** Дані саме цієї помилки; форма своя під кожен код. */
  meta?: Record<string, unknown>
  /** Технічний текст для розробника. */
  detail?: string
}

export interface ApiProblem {
  status: number
  /** Категорія: `VALIDATION_FAILED`, `BUSINESS_RULE_VIOLATION`, `FORBIDDEN`… */
  code: string
  title: string
  detail?: string
  /** Порожнім не буває: одне порушення — один запис. */
  errors: ApiProblemEntry[]
}

export class ApiProblemHelper {
  /**
   * `null` — тіло не схоже на нашу помилку (проксі, HTML-сторінка, обрив).
   *
   * `httpStatus` — запасний варіант для поля `status`: код у тілі й код
   * відповіді той самий, а от тіло по дорозі могли підрізати. Ознака «наше»
   * лишається одна — `code`.
   */
  static parse(body: unknown, httpStatus: number): ApiProblem | null {
    if (typeof body !== 'object' || body === null) return null

    const { status, code, title, detail, errors } = body as Record<string, unknown>

    if (typeof code !== 'string') return null

    return {
      status: typeof status === 'number' ? status : httpStatus,
      code,
      title: typeof title === 'string' ? title : code,
      detail: typeof detail === 'string' ? detail : undefined,
      errors: Array.isArray(errors)
        ? errors.flatMap(entry => ApiProblemHelper.entry(entry) ?? [])
        : [],
    }
  }

  private static entry(raw: unknown): ApiProblemEntry | null {
    if (typeof raw !== 'object' || raw === null) return null

    const { code, field, meta, detail } = raw as Record<string, unknown>

    if (typeof code !== 'string') return null

    return {
      code,
      field: typeof field === 'string' ? field : undefined,
      meta: typeof meta === 'object' && meta !== null ? meta as Record<string, unknown> : undefined,
      detail: typeof detail === 'string' ? detail : undefined,
    }
  }

  /** Записи, що стосуються полів форми: їх роздають самим полям. */
  static fieldEntries(problem: ApiProblem): ApiProblemEntry[] {
    return problem.errors.filter(entry => entry.field !== undefined)
  }

  /** Перший запис — те, що показуємо, коли порушення одне (найчастіший випадок). */
  static primary(problem: ApiProblem): ApiProblemEntry | null {
    return problem.errors[0] ?? null
  }
}
