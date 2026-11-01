// Стандартные пресеты опций для @tanstack/vue-query.
// Хелперы локальные (на каждой useQuery), глобальный QueryClient не трогаем —
// см. CLAUDE.md §5 ("Lazy fresh"-стратегия).

import { keepPreviousData } from '@tanstack/vue-query'
import { AppError } from '../api/errors'

/** Сколько раз повторяем то, что МОЖЕТ пройти со второй попытки. */
const NETWORK_RETRIES = 2

/** Скільки живі дані (liveFresh) вважаються свіжими. */
const LIVE_STALE_MS = 15_000

/**
 * 4xx не повторяем: «нет прав», «не найдено» и «данные не прошли проверку» с
 * третьей попытки не станут другими. Дефолт vue-query — три ретрая, поэтому
 * один 403 уходил на сервер четырьмя запросами.
 */
function isRetryable(error: unknown): boolean {
  if (!(error instanceof AppError)) return true
  // Сервер не встиг: повтор додав би йому ще один такий самий важкий запит.
  if (error.isTimeout || error.status === 504) return false

  return error.status < 400 || error.status >= 500
}

/** Корінь сімейства: рядок або вкладений префікс (`['directories', 'plan-zones']`). */
type FamilyRoot = string | readonly [string, ...string[]]
type RootTuple<TRoot extends FamilyRoot> = TRoot extends string ? readonly [TRoot] : TRoot

/** Ключ під коренем сімейства: `key(id, 'detail')` → `[...root, id, 'detail']`. */
export type FamilyKey<TPrefix extends readonly string[]> =
  <const TParts extends readonly unknown[]>(...parts: TParts) => readonly [...TPrefix, ...TParts]

/** Фабрика опцій запиту, що знає свій корінь: за ним інвалідація освіжає всі варіанти. */
export type QueryFamily<TPrefix extends readonly string[], TFactory> = TFactory & { readonly root: TPrefix }

export class QueryHelper {
  /**
   * Запит одним оголошенням: ключ, queryFn і пресет свіжості — у фабриці, корінь
   * ключа — тут і більше ніде. Виклик фабрики дає опції для `useQuery`, `.root` —
   * префікс для `invalidateQueries`. Кілька сімейств з одним коренем освіжаються
   * разом. Фабрика повертається як є, тож дженерик (`<const I>`) не губиться.
   */
  static family<const TRoot extends FamilyRoot, TFactory extends (...args: never[]) => unknown>(
    root: TRoot,
    make: (key: FamilyKey<RootTuple<TRoot>>) => TFactory,
  ): QueryFamily<RootTuple<TRoot>, TFactory> {
    const prefix = (typeof root === 'string' ? [root] : root) as RootTuple<TRoot>
    const key: FamilyKey<RootTuple<TRoot>> = (...parts) => [...prefix, ...parts] as const

    return Object.assign(make(key), { root: prefix })
  }

  /**
   * "Lazy fresh" — данные считаются всегда свежими, авто-рефетча нет.
   * Обновление только руками через invalidateQueries / refetch.
   * Используется по дефолту во всех list-/dashboard-фичах проекта.
   */
  static lazyFresh() {
    return {
      staleTime: Infinity,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      placeholderData: keepPreviousData,
      retry: (failureCount: number, error: unknown) =>
        isRetryable(error) && failureCount < NETWORK_RETRIES,
    } as const
  }

  /**
   * Як lazyFresh, але для даних, які міняють інші люди (спільні черги роботи):
   * чужу дію своя вкладка не побачить, тож перезапит — коли екран відкривають і
   * коли повертаються у вікно. 15 с свіжості — щоб перехід між вкладками не
   * слав той самий запит двічі поспіль.
   */
  static liveFresh() {
    return {
      ...QueryHelper.lazyFresh(),
      staleTime: LIVE_STALE_MS,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    } as const
  }

  /**
   * Наступна сторінка для нескінченного списку (`getNextPageParam`): є, доки не
   * набрали `total`. Сюди передають `meta` сторінки.
   */
  static nextPage(page: { current_page: number; per_page: number; total: number }): number | undefined {
    return page.current_page * page.per_page < page.total ? page.current_page + 1 : undefined
  }

  /**
   * Мультивибір фільтра в параметр запиту. Сортуємо, щоб порядок кліків у
   * дропдауні не плодив різні queryKey; порожній вибір не їде зовсім.
   */
  static list<T extends string>(values: readonly T[]): T[] | undefined {
    return values.length > 0 ? [...values].sort() : undefined
  }
}
