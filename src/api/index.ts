import axios, {AxiosRequestConfig, AxiosResponse} from 'axios'
import {AppError} from './errors'
import {ApiProblemHelper} from './errors/apiProblem'

// Sanctum SPA (session cookie auth): шлём куку сессии + XSRF-заголовок.
// Работает на same-origin (API относительный /api/v1 → тот же хост, что и страница).
//
// НЕ переключать это по VITE_API_URL. Прод задаёт переменную своим же
// абсолютным URL — то есть same-origin, — и автоматика гасила там куку с XSRF,
// после чего отваливалась сессия. Непустой VITE_API_URL ≠ чужой домен.
// Один параметр = один рядок query. Булеве шлемо як 1/0, а не "true"/"false":
// Laravel-правило `boolean` приймає 1/0/"1"/"0"/true/false, але НЕ рядок "true",
// у який axios серіалізує булеве за замовчуванням (був 422 на without_manager).
// Масив — як key[]=v (той самий формат, що вже приймає бек для status/fleet_id).
// null/undefined просто випадають — так фільтр «не заданий» не їде порожнім.
function serializeScalar(value: unknown): string {
    if (typeof value === 'boolean') return value ? '1' : '0'
    return String(value)
}

function serializeParams(params: Record<string, unknown>): string {
    const search = new URLSearchParams()

    for (const [key, value] of Object.entries(params)) {
        if (value === null || value === undefined) continue

        if (Array.isArray(value)) {
            for (const item of value) {
                if (item === null || item === undefined) continue
                search.append(`${key}[]`, serializeScalar(item))
            }
            continue
        }

        // Объект — как key[subkey]=v. Порядок ключей сохраняется (и у объекта,
        // и у URLSearchParams), а он бывает значимым: мультисортировка «Звітів»
        // задаёт приоритет именно порядком sort[...]. Без этой ветки объект
        // молча уезжал строкой "[object Object]".
        if (typeof value === 'object') {
            for (const [subKey, subValue] of Object.entries(value)) {
                if (subValue === null || subValue === undefined) continue
                search.append(`${key}[${subKey}]`, serializeScalar(subValue))
            }
            continue
        }

        search.append(key, serializeScalar(value))
    }

    return search.toString()
}

/**
 * Ліміт звичайного запиту. Без нього завислий сервер тримав таблицю в
 * завантаженні вічно; так людина отримує помилку з «Повторити».
 */
export const REQUEST_TIMEOUT_MS = 60_000

/** Вивантаження файлів і завантаження чеків: вони законно йдуть довше. */
export const LONG_REQUEST_TIMEOUT_MS = 5 * 60_000

const axiosInstance = axios.create({
    withCredentials: true,
    withXSRFToken: true,
    paramsSerializer: serializeParams,
    timeout: REQUEST_TIMEOUT_MS,
    // Таймаут — окремим кодом ETIMEDOUT, а не спільним з обривом ECONNABORTED.
    transitional: { clarifyTimeoutError: true },
});

// Единственное место, где ошибка транспорта превращается в AppError.
//
// Тело разбирается тут, текст по коду даёт словарь (`shared/errors`) — методам api
// ловить нечего, и текст под статус не пишется в каждом методе заново.
//
// Перехватчик СОБИРАЕТ ошибку, но НЕ показывает её. Показ — дело UI-слоя
// (`useHandleError`), и причина не в чистоте слоёв: 5xx он тостил сам, а поверх
// того же 5xx onError мутации тостил второй раз, и пользователь получал два
// сообщения об одной ошибке. У запроса с ретраями — по тосту на попытку.
axiosInstance.interceptors.response.use(
    res => res,
    err => {
        // Отменённый запрос — не ошибка: это мы сами оборвали устаревший запрос
        // при смене фильтра. Пропускаем как есть — обёртки он не заслуживает.
        if (axios.isCancel(err)) return Promise.reject(err)

        if (!axios.isAxiosError(err)) return Promise.reject(err)

        // 0 — ответа не было вовсе (сеть, таймаут, CORS). Отдельное значение, а
        // не 500: сервер мог и не получить запрос, и повторить его безопасно.
        const status = err.response?.status ?? 0

        // message — для лога и devtools; пользовательский текст даёт словарь.
        const error = new AppError(status, err.message)
        error.isTimeout = err.code === 'ETIMEDOUT'

        return readErrorBody(err.response?.data).then(body => {
            error.problem = ApiProblemHelper.parse(body, status)
            return Promise.reject(error)
        })
    },
)

// Запрос файла (`responseType: 'blob'`) получает Blob-ом и ошибку — тот же JSON
// контракта. Без чтения код ошибки терялся, и вместо текста по коду был текст
// по статусу. Не JSON (HTML прокси) — как и раньше: problem = null.
async function readErrorBody(data: unknown): Promise<unknown> {
    if (!(data instanceof Blob) || !data.type.includes('json')) return data
    try {
        return JSON.parse(await data.text())
    } catch {
        return null
    }
}

export default abstract class BaseApi {
    protected abstract readonly baseUrl: string

    protected joinPath(path1: string, path2?: string) {
        if (!path1) return ''
        if (!path2) return path1
        return `${path1}/${path2}`
    }

    protected get fullBaseUrl() {
        return this.parentApi
            ? this.joinPath(this.parentApi.fullBaseUrl, this.baseUrl)
            : this.baseUrl
    }

    constructor(private parentApi?: BaseApi) {
    }

    protected _post<T = any>(
        url: string,
        body: Record<string, any>,
        config: AxiosRequestConfig = {},
    ) {
        return axiosInstance.post<T>(this.getMethodUrl(url), body, config)
    }

    protected _put<T = any>(
        url: string,
        body: Record<string, any>,
        config: AxiosRequestConfig = {},
    ) {
        return axiosInstance.put<T>(this.getMethodUrl(url), body, config)
    }

    protected _patch<T = any>(
        url: string,
        body: Record<string, any>,
        config: AxiosRequestConfig = {},
    ) {
        return axiosInstance.patch<T>(this.getMethodUrl(url), body, config)
    }

    protected _get<T = any>(url: string, config: AxiosRequestConfig = {}) {
        return axiosInstance.get<T, AxiosResponse<T>>(this.getMethodUrl(url), config)
    }

    protected _delete<T = any>(url: string, config: AxiosRequestConfig = {}) {
        return axiosInstance.delete<T>(this.getMethodUrl(url), config)
    }

    private getMethodUrl(url: string) {
        return this.joinPath(this.fullBaseUrl, url)
    }
}
