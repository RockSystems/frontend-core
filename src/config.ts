// Ядро не знает языка и форматов проекта: тексты, числа и реакцию на сбой
// проект передаёт один раз при старте — `SharedConfig.configure(...)` до монтирования.

export type SharedLabels = {
    close: string
    clear: string
    expandRow: string
    collapseRow: string
    /** Подсказка на ячейке раскрытия: как раскрыть все строки разом. */
    toggleRowHint: string
    dateFrom: string
    dateTo: string
    fileDrop: string
    fileRemove: string
    /** Пустое обязательное поле (zod: undefined / null). */
    required: string
    /** «Сторінка 2 з 9»: номер страницы ядро выделяет само, поэтому две части. */
    pagerPage: string
    pagerOf: string
    /** Общее количество со словом в нужной форме: «1 482 записи». */
    pagerRows: (count: number) => string
    /** Пункт выбора размера страницы: «25 / стор.». */
    perPage: (size: number) => string
    /** Подписи для читалки экрана: стрелки и выбор размера страницы — без текста. */
    pagerPrev: string
    pagerNext: string
    pagerPerPage: string
    /** Удалённый список фильтра (`FilterSelect` с `fetchPage`): загрузка, сбой, повтор, ещё. */
    loading: string
    loadFailed: string
    retry: string
    loadMore: string
    /** Кнопка «глазик» у поля пароля (`PasswordReveal`). */
    showPassword: string
    hidePassword: string
}

export type SharedConfigValue = {
    labels: SharedLabels
    formatNumber: (value: number) => string
    formatMoney: (value: number) => string
    /** Сбой фонового действия (`useSharedAsync`): тост или другая поверхность проекта. */
    handleError: (error: unknown) => void
    /** Сбой, который ядро уже показало на месте (список фильтра): только в трекинг. */
    reportError?: (error: unknown) => void
}

let current: SharedConfigValue | null = null

export const SharedConfig = {
    configure(value: SharedConfigValue): void {
        current = value
    },
    get(): SharedConfigValue {
        // Без конфига ядро молча показало бы пустые подписи — лучше упасть сразу.
        if (!current) throw new Error('SharedConfig.configure() must be called before using _shared')
        return current
    },
}
