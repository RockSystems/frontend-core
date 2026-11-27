// Ядро не знает языка и форматов проекта: тексты, числа и реакцию на сбой
// проект передаёт один раз при старте — `SharedConfig.configure(...)` до монтирования.

import type { Component } from 'vue'
import type { Period } from './helpers/period.helper'
import type { ApiProblemEntry } from './api/errors/apiProblem'

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
    /**
     * Файл не того типу, що в `accept` поля: «Підходять лише .csv, .xlsx».
     * Без нього під полем буде сам перелік типів.
     */
    fileWrongType?: (accept: string) => string
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
    /**
     * Порожній пункт списку форми (`SelectFormInput`): `empty` — у необов'язковому полі, ним
     * скидають вибір («Не вказано»); `choose` — підказка в обов'язковому («Оберіть»).
     * Без них порожній пункт без тексту, як було.
     */
    select?: { empty: string; choose: string }
    /** Удалённый список фильтра (`FilterSelect` с `fetchPage`): загрузка, сбой, повтор, ещё. */
    loading: string
    loadFailed: string
    retry: string
    loadMore: string
    /** Кнопка «глазик» у поля пароля (`PasswordReveal`). */
    showPassword: string
    hidePassword: string
    /** Спільні слова. */
    yes: string
    no: string
    cancel: string
    back: string
    apply: string
    /** Поле пошуку й пікер із серверним пошуком. */
    clearSearch: string
    searching: string
    searchTruncated: (shown: number, total: number) => string
    /** Таблиці: лічильники отримують уже відформатовані числа. */
    tableShown: (loaded: string, total: string) => string
    tableShownShort: (loaded: string) => string
    tableLoadingMore: string
    tableLoadFailed: string
    /**
     * Кнопка виду таблиці з другими рядками колонок: на що вона перемкне
     * («Розгорнути таблицю» / «Стиснути таблицю»). Без них кнопка лише з іконкою.
     */
    tableView?: { toWide: string; toStacked: string }
    /** Підказка на межі колонок у шапці: як змінити ширину й повернути автоматичну. */
    columnResize?: string
    /** Підказка значка в куті шапки: усім колонкам — автоматичну ширину. */
    columnWidthsReset?: string
    /** Плашки комірки не влізли в три рядки (TableChips): «ще 4». Без нього — «+4». */
    tableMore?: (count: number) => string
    /** Підказка обрізаної комірки: клік відкриває повний текст. Без неї — сам текст. */
    tableShowFull?: string
    /** Рядок фільтрів. */
    resetFilters: string
    exportPreparing: string
    exportDone: (filename: string) => string
    exportTitle: (format: string, period?: Period, note?: string) => string
    /** Поле періоду. */
    allDates: string
    periodRemove: string
    periodWeeksOnly: string
    periodPickBoth: string
    /** Локаль `Intl` для підписів періоду: «2–8 лют. 2026». */
    dateLocale: string
    /** Суфікс року, який `formatRange` дописує в кінці («р.»), — компактний підпис без нього. */
    rangeYearSuffix: RegExp
    weekLabel: (week: number) => string
    weeksLabel: (first: number, last: number) => string
    periodPresets: {
        today: string
        yesterday: string
        thisWeek: string
        prevWeek: string
        last2Weeks: string
        last4Weeks: string
        thisMonth: string
        prevMonth: string
        thisQuarter: string
        prevQuarter: string
        thisYear: string
        prevYear: string
        last30Days: string
        last90Days: string
    }
    /** Місяці: дванадцять назв від січня, називний відмінок. */
    monthNames: readonly string[]
    monthShortNames: readonly string[]
    monthPlaceholder: string
    allMonths: string
    /** Сортування: підписи напрямків за родом значення й панель. */
    sortDirections: {
        numeric: Record<'asc' | 'desc', string>
        text: Record<'asc' | 'desc', string>
        date: Record<'asc' | 'desc', string>
        group: Record<'asc' | 'desc', string>
    }
    sortTitle: string
    sortEmpty: string
    sortEmptyShort: string
    sortReset: string
    sortRemove: string
    sortAdd: string
}

/** Тексти помилок API: логіка в `errors/apiError.helper`, слова й коди в проєкту. */
export type SharedErrorTexts = {
    /** Код бека → текст або функція від `meta` цього коду. */
    codes: Record<string, string | ((meta: any) => string)>
    /** Запасний варіант, коли коду в словнику немає: за HTTP-статусом (0 — немає звʼязку). */
    byStatus: Record<number, string>
    serverError: string
    timeout: string
    fallback: string
    /** Текст запису валідації за його правилом (`meta.rule`). */
    rule: (entry: ApiProblemEntry) => string
    /** Показувати `detail` людині, коли коду немає: для бека, що ще не на кодах. За замовчуванням ні. */
    showDetail?: boolean
    /** Своє правило «поле бека → поле форми» понад точний збіг, camelCase і `map`. */
    resolveField?: (path: string, fields: readonly string[]) => string | undefined
    /** Яких полів стосується запис, якщо не лише `entry.field` (код, що каже про кілька полів у `meta`). */
    fieldsOf?: (entry: ApiProblemEntry) => readonly string[]
}

export type SharedConfigValue = {
    labels: SharedLabels
    /** Свій формат чисел і грошей. Без них — `NumberHelper.format` і `MoneyHelper.format` ядра. */
    formatNumber?: (value: number) => string
    formatMoney?: (value: number) => string
    /** Тексти помилок API. */
    errors: SharedErrorTexts
    /**
     * Показати помилку людині: тост, стор сповіщень. `id` склеює однакові,
     * `isSessionExpired` — привід дати дію «Увійти».
     */
    notifyError: (text: string, context: { id: string; isSessionExpired: boolean }) => void
    /** Посилання для `UiButton`: `RouterLink` + `to` чи Inertia `Link` + `href`. */
    link: { component: Component; prop: string }
    /** «Назад» у `UiBackLink`: по історії, а якщо її немає — на `fallback`. Роутер знає проєкт. */
    goBack: (fallback: string | object) => void
    /**
     * Шлях поточної сторінки для `UiPageTabs`, реактивно (`usePage().url`, `route.path`).
     * Без нього — `window.location.pathname`.
     */
    currentPath?: () => string
    /** Сбой, который ядро уже показало на месте (список фильтра): только в трекинг. */
    reportError?: (error: unknown) => void
    /**
     * Своє сховище вибору виду таблиць (акаунт), реактивно. Необов'язкове: без
     * нього ядро памʼятає вибір у браузері. З ним `get()` головний, а поки він
     * `null` (налаштування ще не прийшли) — діє вибір із браузера.
     */
    tableView?: {
        get: () => TableView | null
        set: (value: TableView) => void
    }
    /**
     * Своє сховище ширин колонок, які користувач підтягнув руками (акаунт),
     * реактивно, по ключу таблиці. Необов'язкове: без нього ядро памʼятає їх у
     * браузері. `get()` повертає `null`, поки налаштування не прийшли.
     */
    columnWidths?: {
        get: (tableKey: string) => ColumnWidths | null
        set: (tableKey: string, widths: ColumnWidths) => void
    }
}

/** Ширини колонок таблиці в пікселях за id колонки — лише ті, що змінили руками. */
export type ColumnWidths = Record<string, number>

/**
 * Вид таблиці з другими рядками колонок (`ctx.sub`): розгорнутий — кожна
 * деталь своєю колонкою поруч зі своєю парою, стиснутий — деталь під основним
 * значенням.
 */
export type TableView = 'wide' | 'stacked'

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
