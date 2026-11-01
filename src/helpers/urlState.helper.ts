// Универсальный мост между фильтрами фичи и URL query-string.
//
// Идея простая:
//  • Чтение — `readUrl()` отдаёт объект с методами get / getList.
//  • Запись — `writeUrl({ key: value | null })`. Значение `null`/`undefined`
//    означает удалить параметр. История браузера не засоряется — replaceState.
//
// Каждая фича пишет тонкую обёртку (read<Feature>Url / write<Feature>Url)
// которая знает свои ключи и значения. Никакой реактивной магии: фича сама
// решает, когда читать и когда писать (watch / debounce / immediate).
//
// SSR-safe: при `typeof window === 'undefined'` read возвращает пусто, write — no-op.

export interface UrlReader {
  get(key: string): string | null
  getList(key: string, sep?: string): string[]
}

export type UrlValue = string | number | null | undefined

export class UrlStateHelper {
  static readonly EMPTY_READER: UrlReader = {
    get: () => null,
    getList: () => []
  }

  static readUrl(): UrlReader {
    if (typeof window === 'undefined') return UrlStateHelper.EMPTY_READER
    const params = new URLSearchParams(window.location.search)
    return {
      get: (key) => params.get(key),
      getList: (key, sep = ',') => {
        const raw = params.get(key)
        return raw ? raw.split(sep).filter(Boolean) : []
      }
    }
  }

  static writeUrl(updates: Record<string, UrlValue>): void {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === undefined || value === '') {
        params.delete(key)
      } else {
        params.set(key, String(value))
      }
    }
    const qs = params.toString()
    const next = `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`
    window.history.replaceState(window.history.state, '', next)
  }
}
