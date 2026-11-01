# Зміни

Формат і правила версій: [README](README.md#як-змінювати-ядро). Журнал синків до появи цього репозиторію: [docs/history-before-1.0.md](docs/history-before-1.0.md).

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

- `DateRangeField` і `FiltersBar`: період можна зняти (`isClearable`, `isPeriodClearable`) з Rockstaff.
- `useAppForm`: повторний Enter під час запиту не шле другий, `useAppFieldArray`, тихе `ActionCancelledError` з TIR. Роздача помилок по полях з Rockwheel.
- `useHandleError`: однакові помилки склеюються в один тост (TIR). 419 теж вважається завершеною сесією.
- `ApiErrorHelper`: прикладний код важливіший за запис валідації, навіть якщо стоїть не першим (TIR). `errors.resolveField` і `errors.fieldsOf` для проєктних правил полів.
- `useServerList`: `total` за замовчуванням із `meta.total` або `total`.

**Чого свідомо ще немає в ядрі**

- `money.helper` і `number.helper`: у проєктах різна поведінка (локаль, валюта, рядки, порожні значення). Об'єднати без зміни того, що бачить людина, не можна.
- `toast.scss`, `_mixins.scss`: відрізняються виглядом, поки стилі проєкту.
- `navigation.helper`, `useAuth`, `UiPageTabs`, `apiErrorCode`, `validationRuleTexts`: знають роутер, права чи коди конкретного проєкту.

## 1.0.0

Ядро винесено з Rockwheel в окремий репозиторій. Код той самий, що в `resources/js/_shared` після Rockwheel PR 255 і 270.

Проти копій, що зараз лежать у Rockstaff і TIR:

- **Новий тип `Paged<T>`** (`{ data, meta: Pagination }`) в `api/types.ts`: сторінка списку.
- **Видалено `PaginatedResponse3`**: його ніхто не використовує.
- **`types/table.d.ts` тепер у ядрі**: поля `align`, `hint`, `emphasis` у `ColumnMeta` потрібні самому ядру. Свою копію в проєкті прибрати під час переходу на пакет.
- **`$radius` записано в контракт токенів**: ядро його використовувало, але ніде не було сказано, що проєкт мусить його дати.
