// Мета-опис фільтрів фічі в адресному рядку: один ключ — один запис, читання й
// запис поруч.
//
// Було: `read<Feature>Url` і `write<Feature>Url` перелічували ті самі ключі
// двічі, за двадцять рядків один від одного. Додав фільтр, забув другий
// список — фільтр працює, але не переживає перезавантаження, і жоден тип цього
// не ловить. Тут пара фізично не може розійтися: її неможливо оголосити
// нарізно.
//
// Тип стану виводиться зі схеми (`UrlStateOf<typeof SCHEMA>`) — свого
// інтерфейсу поруч тримати не треба, а Ctrl+Click по полю веде в саму схему,
// де видно і ключ в адресі, і правило розбору.
//
// Живе в `shared`, а не в `_shared`: спирається на UrlParamsHelper, який теж тут.

import { UrlStateHelper, type UrlReader, type UrlValue } from './urlState.helper'
import type { ServerSortEntry, SortDirection } from '../composables/useServerTable'
import { MonthHelper } from './month.helper'
import { PeriodPresetsHelper } from './periodPresets.helper'
import { UrlParamsHelper, type UrlPeriod } from './urlParams.helper'

/**
 * Як одне поле стану лягає в адресу. `write` віддає мапу ключів, а не один
 * рядок: період — це два ключі, і він має лишатись одним полем стану.
 */
export interface UrlCodec<T> {
  read(params: UrlReader): T
  write(value: T): Record<string, UrlValue>
}

// `any` тут — той самий випадок, що ColumnDef<T, any> у TanStack: без нього
// UrlCodec<string> не присвоюється до UrlCodec<unknown> через контраваріантний
// `write`, і жодна схема не проходить перевірку.
type UrlShape = Record<string, UrlCodec<any>>

type UrlState<S extends UrlShape> = {
  [K in keyof S]: S[K] extends UrlCodec<infer T> ? T : never
}

export interface UrlSchema<S extends UrlShape> {
  read: () => UrlState<S>
  write: (state: UrlState<S>) => void
  /** Стан чистої адреси: до нього веде «Скинути фільтри». */
  blank: () => UrlState<S>
  /**
   * Ключі адреси, якими володіє схема. Збережений вигляд сторінки — саме вони;
   * решта адреси (відкрита картка, вкладка) до вигляду не належить.
   */
  readonly keys: readonly string[]
}

/**
 * Стан фічі, виведений зі схеми: `UrlStateOf<typeof SCHEMA>`. Руками інтерфейс
 * більше не пишемо — інакше він і був би третім місцем, де перелічені ключі.
 */
export type UrlStateOf<T extends { read: () => unknown }> = ReturnType<T['read']>

export class UrlSchemaHelper {
  /**
   * Схема з мапи «поле стану → кодек». Стрілки, а не методи: щоб фіча могла
   * віддати їх як є (`export const readFooUrl = SCHEMA.read`), не загортаючи
   * у власну функцію.
   */
  static create<S extends UrlShape>(shape: S): UrlSchema<S> {
    const entries = Object.entries(shape) as Array<[keyof S & string, UrlCodec<unknown>]>

    const readFrom = (params: UrlReader): UrlState<S> => {
      const state = {} as UrlState<S>

      for (const [field, codec] of entries) {
        state[field] = codec.read(params) as UrlState<S>[typeof field]
      }

      return state
    }

    // Кодек пише свої ключі й для порожнього значення (null — прибрати з адреси),
    // тож запис чистого стану перелічує їх усі. Ліниво: схеми створюються при
    // імпорті модуля, а ключі потрібні лише виглядам.
    let keys: string[] | null = null

    return {
      read: () => readFrom(UrlStateHelper.readUrl()),
      blank: () => readFrom(UrlStateHelper.EMPTY_READER),

      get keys(): readonly string[] {
        if (!keys) {
          const blank = readFrom(UrlStateHelper.EMPTY_READER)
          keys = [...new Set(entries.flatMap(([field, codec]) => Object.keys(codec.write(blank[field]))))]
        }

        return keys
      },

      write: (state) => {
        const updates: Record<string, UrlValue> = {}

        for (const [field, codec] of entries) {
          Object.assign(updates, codec.write(state[field]))
        }

        UrlStateHelper.writeUrl(updates)
      },
    }
  }

  /**
   * ?from=&to= — одне поле стану на два ключі (див. UrlParamsHelper.period).
   * Період із пресету пишеться кодом (`range=thisMonth`) замість дат: посилання
   * й збережений вигляд відкриються на поточний місяць, а не на той, коли їх
   * зберегли.
   */
  static period(fromKey = 'from', toKey = 'to', rangeKey = 'range'): UrlCodec<UrlPeriod | null> {
    return {
      read: (params) => {
        const range = params.get(rangeKey)
        if (range && PeriodPresetsHelper.isId(range)) return PeriodPresetsHelper.resolve(range)

        return UrlParamsHelper.period(params, fromKey, toKey)
      },
      write: value => value?.preset
        ? { [rangeKey]: value.preset, [fromKey]: null, [toKey]: null }
        : { [rangeKey]: null, [fromKey]: value?.from ?? null, [toKey]: value?.to ?? null },
    }
  }

  /** Вільний текст (пошук). Порожній рядок в адресу не потрапляє. */
  static text(key: string): UrlCodec<string> {
    return {
      read: params => params.get(key) ?? '',
      write: value => ({ [key]: value || null }),
    }
  }

  /** Рядок без перевірки — для доменних id, форму яких ми не знаємо (fleet_id). */
  static raw(key: string): UrlCodec<string | null> {
    return {
      read: params => params.get(key) || null,
      write: value => ({ [key]: value }),
    }
  }

  static isoDate(key: string): UrlCodec<string | null> {
    return {
      read: params => UrlParamsHelper.isoDate(params.get(key)),
      write: value => ({ [key]: value }),
    }
  }

  /**
   * Пара «менеджери / без менеджера» одним ключем адреси (`mgr=id,id` або
   * `mgr=none`): обидва разом адреса не виразить, тож і стан однозначний. У
   * стані — звична пара полів, як на інших вкладках (`...managersInOneKey()` у
   * схемі). Порядок важливий: `isWithoutManager` пишеться ПІСЛЯ й перекриває
   * ключ.
   */
  static managersInOneKey(key: string) {
    const none = 'none'

    return {
      managerIds: UrlSchemaHelper.custom<string[]>({
        // Синтетичне значення прибираємо зі списку id, інакше воно поїхало б на
        // бек як ulid. Форму решти перевіряємо: сміття теж дало б 422.
        read: (params) => {
          const raw = params.getList(key)
          return raw.includes(none) ? [] : UrlParamsHelper.ulids(raw)
        },
        write: ids => ({ [key]: ids.length > 0 ? ids.join(',') : null }),
      }),
      isWithoutManager: UrlSchemaHelper.custom<boolean>({
        read: params => params.getList(key).includes(none),
        write: (isWithout): Record<string, UrlValue> => (isWithout ? { [key]: none } : {}),
      }),
    }
  }

  /**
   * Календарний місяць `YYYY-MM` одним ключем — не пара from/to. Сміття —
   * так само, як відсутній: бек на нього відповів би 422.
   */
  static month(key: string): UrlCodec<string | null> {
    return {
      read: (params) => {
        const raw = params.get(key)
        return raw && MonthHelper.isMonth(raw) ? raw : null
      },
      write: value => ({ [key]: value }),
    }
  }

  /** Значення з білого списку; чуже — так само, як відсутнє. */
  static oneOf<T extends string>(key: string, allowed: readonly T[]): UrlCodec<T | null> {
    return {
      read: params => UrlParamsHelper.oneOf(params.get(key), allowed),
      write: value => ({ [key]: value }),
    }
  }

  /** Те саме, але з дефолтом: він і читається замість сміття, і не пишеться. */
  static oneOfOr<T extends string>(key: string, allowed: readonly T[], fallback: T): UrlCodec<T> {
    return {
      read: params => UrlParamsHelper.oneOf(params.get(key), allowed) ?? fallback,
      write: value => ({ [key]: value === fallback ? null : value }),
    }
  }

  static manyOf<T extends string>(key: string, allowed: readonly T[]): UrlCodec<T[]> {
    return {
      read: params => UrlParamsHelper.manyOf(params.getList(key), allowed),
      write: value => ({ [key]: value.length > 0 ? value.join(',') : null }),
    }
  }

  /**
   * Те саме з дефолтом: немає ключа — дефолт, і дефолт не пишеться. Порожній
   * вибір пишеться явним `any`, інакше після перезавантаження він став би
   * дефолтом, а не «будь-який».
   */
  static manyOfOr<T extends string>(key: string, allowed: readonly T[], fallback: readonly T[]): UrlCodec<T[]> {
    const isFallback = (value: readonly T[]) =>
      value.length === fallback.length && value.every(item => fallback.includes(item))

    return {
      read: (params) => {
        const raw = params.get(key)
        if (raw === null) return [...fallback]
        if (raw === 'any') return []

        return UrlParamsHelper.manyOf(params.getList(key), allowed)
      },
      write: value => ({ [key]: isFallback(value) ? null : value.length > 0 ? value.join(',') : 'any' }),
    }
  }

  /** Список доменних id: перевіряємо форму, бо білого списку в нас немає. */
  static ulids(key: string): UrlCodec<string[]> {
    return {
      read: params => UrlParamsHelper.ulids(params.getList(key)),
      write: value => ({ [key]: value.length > 0 ? value.join(',') : null }),
    }
  }

  /** Список як є — коли значення перевіряє вже сам бек. */
  static list(key: string): UrlCodec<string[]> {
    return {
      read: params => params.getList(key),
      write: value => ({ [key]: value.length > 0 ? value.join(',') : null }),
    }
  }

  static flag(key: string): UrlCodec<boolean> {
    return {
      read: params => UrlParamsHelper.flag(params.get(key)),
      write: value => ({ [key]: UrlParamsHelper.writeFlag(value) }),
    }
  }

  static triState(key: string): UrlCodec<boolean | null> {
    return {
      read: params => UrlParamsHelper.triState(params.get(key)),
      write: value => ({ [key]: UrlParamsHelper.writeTriState(value) }),
    }
  }

  static sortDirection(key: string): UrlCodec<SortDirection | null> {
    return {
      read: params => UrlParamsHelper.sortDirection(params.get(key)),
      write: value => ({ [key]: value }),
    }
  }

  static page(key = 'page'): UrlCodec<number> {
    return {
      read: params => UrlParamsHelper.page(params.get(key)),
      write: value => ({ [key]: UrlParamsHelper.writePage(value) }),
    }
  }

  /**
   * Стек мультисортування одним ключем: `sort=payable:desc,full_name:asc`.
   *
   * Список, а не мапа: порядок ключів = пріоритет, і в адресі він має бути
   * видно. Пара `sort_by`/`sort_dir` двох сортувань не виражає взагалі.
   *
   * Відсіюємо все, що бек поверне 422: невідомий ключ (перейменували колонку),
   * кривий напрямок, дубль того самого ключа (TanStack його не втримає).
   */
  static sortList<T extends string>(
    key: string,
    allowed: readonly T[],
  ): UrlCodec<Array<ServerSortEntry<T>>> {
    return {
      read: (params) => {
        const raw = params.get(key)
        if (!raw) return []

        const seen = new Set<T>()

        return raw.split(',').reduce<Array<ServerSortEntry<T>>>((acc, chunk) => {
          const [by, direction] = chunk.split(':') as [T, SortDirection]

          if (!allowed.includes(by)) return acc
          if (direction !== 'asc' && direction !== 'desc') return acc
          if (seen.has(by)) return acc

          seen.add(by)
          acc.push({ by, direction })

          return acc
        }, [])
      },
      write: value => ({
        [key]: value.length > 0 ? value.map(e => `${e.by}:${e.direction}`).join(',') : null,
      }),
    }
  }

  /**
   * Кодек зі своїм розбором — для ключів, які не лягають на готові: список
   * `key:dir` у «Звітах», пара «менеджери або нічиї» під одним ключем.
   *
   * Функція-тотожність, і в цьому суть: вона змушує написати читання й запис
   * поруч, замість двох шматків у різних кінцях файлу.
   */
  static custom<T>(codec: UrlCodec<T>): UrlCodec<T> {
    return codec
  }
}
