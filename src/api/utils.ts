import {AxiosResponse} from "axios";
import { BaseResponse, PaginatedResponse, PaginatedResponse2 } from './types'

export async function fetchAllWithoutPagination<T, R>(
    fetch: (page: number) => Promise<AxiosResponse<PaginatedResponse<T>>>,
    mapper: (item: T) => R
): Promise<R[]>;
export async function fetchAllWithoutPagination<T>(
    fetch: (page: number) => Promise<AxiosResponse<PaginatedResponse<T>>>
): Promise<T[]>;
export async function fetchAllWithoutPagination<T, R>(
    fetch: (page: number) => Promise<AxiosResponse<PaginatedResponse<T>>>,
    mapper?: (item: T) => R
): Promise<T[] | R[]> {
    let page = 1;
    let hasMore = true;
    const aggregated: R[] = [];

    while (hasMore) {
        const response = await fetch(page);
        const { data, links, meta } = response.data;

        const rawItems = data || [];
        const processedItems = mapper ? rawItems.map(mapper) : (rawItems as unknown as R[]);

        aggregated.push(...processedItems);

        // Самый надежный способ проверки пагинации Laravel:
        hasMore = !!(links?.next && meta && meta.current_page < meta.last_page);
        page++;
    }
    return aggregated;
}

export async function fetchAllWithoutPagination2<T, R>(
  fetch: (page: number) => Promise<BaseResponse<PaginatedResponse2<T>>>,
  mapper: (item: T) => R
): Promise<R[]>;
export async function fetchAllWithoutPagination2<T>(
  fetch: (page: number) => Promise<BaseResponse<PaginatedResponse2<T>>>
): Promise<T[]>;
export async function fetchAllWithoutPagination2<T, R>(
  fetch: (page: number) => Promise<BaseResponse<PaginatedResponse2<T>>>,
  mapper?: (item: T) => R
): Promise<T[] | R[]> {
  let page = 1;
  let hasMore = true;
  const aggregated: any[] = []; // Используем any внутри для гибкости реализации

  while (hasMore) {
    const response = await fetch(page);
    const { data, pagination } = response.data;

    const rawItems = data || [];
    // Важный момент: помогаем TS понять, что если маппера нет, то это массив T
    const processedItems = mapper
      ? rawItems.map(mapper)
      : (rawItems as unknown as R[]);

    aggregated.push(...processedItems);

    hasMore = pagination.current_page < pagination.last_page;
    page++;
  }

  // Кастуем к итоговому типу, чтобы убрать ошибку про unknown[]
  return aggregated as T[] | R[];
}
