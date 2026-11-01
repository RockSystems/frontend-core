// Успішна відповідь API: тільки `data`. Полів `success`/`message` більше немає,
// а `status`/`errorCode` тут ніколи й не було — тип описував те, чого бек не
// присилав, і працював лише тому, що всі виклики читають `res.data.data`.
// Форма помилки — окремо, `_shared/api/errors/apiProblem.ts`.
export type BaseResponse<T> = {
    data: T
}

/** Напрямок сортування в запиті й у стані таблиці. */
export type SortDirection = 'asc' | 'desc'

export interface PaginatedResponse<T> {
    data: T[];
    links: {
        first: string,
        last: string,
        prev: string | null,
        next: string | null,
    }
    meta?: {
        links: {
            url: string | null,
            page: number | null,
            label: string,
            active: boolean
        }[],
        from: number
        to: number,
        current_page: number
        last_page: number
        path: string,
        per_page: number,
        total: number
    };
}

export interface PaginatedResponse2<Data> {
  data: Data[]
  pagination: Pagination
}

export interface Pagination {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

/** Сторінка списку: рядки в `data`, лічильники в `meta`. */
export interface Paged<Data> {
  data: Data[]
  meta: Pagination
}
