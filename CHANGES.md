# Зміни

Формат і правила версій: [README](README.md#як-змінювати-ядро).

## 3.1.0

- **Плагін `frontendCore()` для Vite**, імпорт з `@rock555/frontend-core/vite`: аліас `@/_shared`, `optimizeDeps` і `dedupe` однією строкою. Проєкту: замінити ними свої рядки у `vite.config`. Старе теж працює.
- **`CORE_PATH=../frontend-core npm run dev`** бере ядро з папки, правки видно без публікації.
- Пакет публікується сам після вливання в `main` з новою версією, тег руками не ставимо. PR, що змінює код пакета без нової версії, червоний.
- `npm run check:projects` ставить ядро в чисті копії проєктів і перевіряє їх.

## 3.0.0

Правки, що накопичились у копії ядра в одному з проєктів, поки її переносили.

**Що ламається і що зробити проєкту**

- `ExportCsvButton` тепер `ExportButton`: новий проп `format` (`CSV` за замовчуванням, `XLSX`), `period` необов'язковий. Оновити імпорт.
- `labels.exportTitle` приймає `(format, period?, note?)` замість `(from, to, note?)`. Переписати рядок у `sharedConfig`.

**Що ще нового**

- `SmartField` кладе `id` прямо у `field`: хто робить `v-bind="field"`, той уже зв'язаний із підписом. `inputId` у слоті лишається для полів, які не біндять `field` цілком. Стилі `.ui-errors` тепер глобальні: радіо й діапазон дат малюють помилки без цієї обгортки.
- `UiKpiGrid`: `labelHint` у картці дає підказку на підпис, довгий підпис не зсуває числа сусідніх карток.
- `FileInput`: видимий фокус з клавіатури.
- `FilterCheckbox`, `FilterSelect`, `SortControlPanel`, `RadioSegmentFormInput`: дрібні правки стану наведення й контрасту.

## 2.0.3

- Перша версія, випущена з CI через trusted publishing. Код той самий, що у 2.0.2, проєкту нічого робити не треба.

## 2.0.2

- **Пакет переїхав на npmjs.com як `@rock555/frontend-core`, токен для встановлення більше не потрібен.** Код той самий, що у 2.0.1. Проєкту: замінити назву пакета в `package.json`, `vite.config` і `tsconfig`, видалити `.npmrc` і секрет `npm_token` зі збірки.
- Новий тест не пропускає в репозиторій і пакет секрети, адреси серверів, пошту й назви проєктів.

## 2.0.1

- **Типи колонок (`align`, `hint`, `emphasis`) ядро підключає само.** Раніше проєкт мусив додати `table.d.ts` у `include` свого tsconfig, а там, де є `exclude: node_modules`, файл відкидався і збірка падала. Проєкту нічого робити не треба, запис з `include` можна прибрати.

## 2.0.0

У ядро переїхав увесь спільний шар, який досі лежав копіями в `shared/` кожного проєкту.

**Що тепер у ядрі**

- Списки: `useServerList`, `useServerTable`, `useVirtualTable`, `useFilterState`, `urlSchema`, `urlParams`, `tableFields`, `sort`.
- Таблиці й фільтри: `UiTableCard`, `TableLoadedFooter`, `TableLoadedCount`, `TableVirtualPad`, `MultiSortHeader`, `BoolBadgeCell`, `FiltersBar`, `DateRangeField`, `MonthField`, `SortControl`, `SortControlPanel`, `ExportCsvButton`, `SearchPicker`.
- UI: `UiButton`, `UiBadge`, `UiCard`, `UiCount`, `UiKpiGrid`, `UiPopover`, `UiSegmented`, `UiActionTiles`, `UiSearchInput`, `UiBackLink`, `GlobalPendingBar`, `ConfirmModal`, `ImageViewerModal`.
- Період і місяці: `periodLabel`, `periodPresets`, `calendarRange`, `month`.
- Помилки: `errors/apiError.helper`, `errors/useHandleError`, `errors/actionCancelled`, `composables/useAppForm`, `composables/useConfirm`.

**Що ламається і що зробити проєкту**

- Імпорти `@/shared/...` цих файлів стають `@/_shared/...`. `useHandleError` тепер у `errors/useHandleError`.
- `SharedConfig`: поле `handleError` прибрано. Натомість обов'язкові `errors`, `notifyError`, `link`, `goBack` і нові підписи в `labels`.
- Новий контракт стилів: токени `$color-selected`, `$color-on-selected`, міксин `buttonPrimary`.
- Нові `peerDependencies`: `@tanstack/vue-virtual`, `@vueuse/core`, `@internationalized/date`, а для `ExportCsvButton` і `SortControlPanel` ще `vue-sonner` і `motion-v`.
- `useConfirm` приймає сервіс модалок: `useConfirm(modals)`.

**Що зібрано з різних проєктів**

- `DateRangeField` і `FiltersBar`: період можна зняти (`isClearable`, `isPeriodClearable`).
- `useAppForm`: повторний Enter під час запиту не шле другий, `useAppFieldArray`, тихе `ActionCancelledError`, роздача помилок по полях.
- `useHandleError`: однакові помилки склеюються в один тост. 419 теж вважається завершеною сесією.
- `ApiErrorHelper`: прикладний код важливіший за запис валідації, навіть якщо стоїть не першим. `errors.resolveField` і `errors.fieldsOf` для проєктних правил полів.
- `useServerList`: `total` за замовчуванням із `meta.total` або `total`.

**Чого свідомо ще немає в ядрі**

- `money.helper` і `number.helper`: у проєктах різна поведінка (локаль, валюта, рядки, порожні значення). Об'єднати без зміни того, що бачить людина, не можна.
- `toast.scss`, `_mixins.scss`: відрізняються виглядом, поки стилі проєкту.
- `navigation.helper`, `useAuth`, `UiPageTabs`, `apiErrorCode`, `validationRuleTexts`: знають роутер, права чи коди конкретного проєкту.

## 1.0.0

Ядро винесено в окремий репозиторій.

Проти попередніх копій у проєктах:

- **Новий тип `Paged<T>`** (`{ data, meta: Pagination }`) в `api/types.ts`: сторінка списку.
- **Видалено `PaginatedResponse3`**: його ніхто не використовує.
- **`types/table.d.ts` тепер у ядрі**: поля `align`, `hint`, `emphasis` у `ColumnMeta` потрібні самому ядру. Свою копію в проєкті прибрати під час переходу на пакет.
- **`$radius` записано в контракт токенів**: ядро його використовувало, але ніде не було сказано, що проєкт мусить його дати.
