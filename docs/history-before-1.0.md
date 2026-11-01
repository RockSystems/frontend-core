# Журнал синків до 1.0.0

Перенесено з Rockwheel `resources/js/_shared/CHANGES.md`, далі без змін.


Журнал для переноса ядра в другие проекты (TIR, Rockstaff и т. д.). После синка —
очистить. Только то, что меняет поведение или API: что сделать в проекте, что
подтягивает ядро.

## Импорты внутри ядра — только относительные

Ядро больше не импортирует само себя через `@/_shared/...`: алиас `@/` в проектах
ведёт в разные места (`resources/js`, `src`). Проекты по-прежнему импортируют ядро
как `@/_shared/...`, менять ничего не нужно. В ESLint Rockwheel для `_shared/**`
запрещён любой `@/*` и выход в слои проекта относительным путём (`../../shared/…`) —
стоит завести такое же правило в проекте (в Rockstaff и TIR уже есть).

## Цвета — контракт токенов (что проект обязан задать в `assets/scss/common`)

Ядро больше не содержит своих цветов: всё через токены проекта. Остались только
нейтральные тени, затемнение под модалкой и белый значок на залитой `UiIconButton`.
Проекту нужны:

- **Новый `$color-border-strong`** — рамки полей ввода (`DateRange`, `RadioSegmentFormInput`,
  `FileInput`, ховер фильтров). Не меньше 3:1 к `$color-surface` (WCAG 1.4.11).
- **Новый `$color-accent-ink`** — ТЕКСТ акцентом: подпись выбранного фильтра и «Показати
  ще» в `FilterSelect`, ховер `UiIconButton`, `ActionCell`, акцентный элемент
  `TimelineChart`, выбранный вариант `RadioSegmentFormInput`. Не меньше 4,5:1 к
  `$color-surface` и к `$color-accent-dim`. Заодно это заливка под белым текстом:
  активный чип `FilterCheckbox` теперь на `$color-accent-ink` (в Rockwheel белый на
  `#1a7aff` давал 4:1). `$color-accent` остаётся для рамок, иконок и заливок без
  текста (≥3:1), поэтому может быть ярким.
- **Фокус `FilterCheckbox`** — рамка `$color-accent` только при фокусе с клавиатуры;
  прежняя тень `rgba(0, 0, 0, .12)` была почти не видна.
- **`$color-muted` — текст, а не декор:** им пишутся подтексты, подписи полей,
  счётчик пагинатора. Не меньше 4,5:1 к `$color-surface`. В Rockwheel был
  `#8b909e` (3,2:1) — стал `#686d7a`, старый цвет ушёл в `$color-border-strong`.
- **Положительные суммы — `$color-green-ink`, а не `$color-green`** (`AmountCell`,
  `MoneyCell`, `TableFooterRow`). Яркий зелёный Rockwheel `#0fb87a` давал 2,6:1.
  `$color-green-ink` уже есть во всех проектах; он обязан быть ≥4,5:1 к `$color-surface`.
- **`$color-danger` ядро пишет текстом** (ошибки полей, отрицательные суммы) — он тоже
  обязан быть ≥4,5:1 к `$color-surface`. Сейчас у всех так: 4,8 / 5,4 / 5,5.

## Удалено из ядра

- **`helpers/storage.helper.ts`** — никто не импортировал; ловил ошибки axios, которых
  после перехватчика `api/index.ts` уже нет (всё приходит как `AppError`).
- **`types/storage.ts`** — доменное (`NO_EMPLOYEE_SELECTED`). Проекту, который его
  использует, перенести файл к себе (в Rockstaff — `shared/types/storage.ts`).
- Пример схем внизу `helpers/form.helper.ts` (живой код с текстами) и `api/mapGenerator.ts` целиком (не экспортировался, нигде не использовался).

## Формы и доступность

- **`SmartField` отдаёт в слот `inputId`** и связывает с ним `<label>`. Поле, которое
  ставит себе `:id="inputId"`, получает фокус по клику на подпись, и читалка называет
  его. Ядро уже делает это в `DateFormInput`, `SelectFormInput`, `TextareaFormInput`;
  свои обёртки над `SmartField` в проекте — по желанию.
- **`RadioSegmentFormInput`**: `fieldset` + `legend` (подпись того же вида, что у
  `SmartField`), выбранный вариант — заливкой `$color-accent-dim` + `$color-accent-ink`,
  выбор с клавиатуры (input больше не `display: none`), id через `useId`.
- **Новые обязательные `labels.pagerPrev`, `pagerNext`, `pagerPerPage`** — подписи
  стрелок и выбора размера страницы в `TablePager`. Добавить в `shared/sharedConfig.ts`
  проекта, иначе ошибка типов.

## API — `api/index.ts`, `helpers/query.helper.ts`

- **`QueryHelper.nextPage(page)`** — `getNextPageParam` для нескінченних списків: наступна
  сторінка, доки `current_page * per_page < total`.
- **`SortDirection` (`asc` | `desc`) — в `api/types.ts`.** Тип контракта запроса: ресурсы
  API берут его звідси, а не з проєктного `useServerTable` (той лише реекспортує).
- **Таймаут запроса 60 с** (`REQUEST_TIMEOUT_MS`); долгим — выгрузкам и
  файлам — передавать `timeout: LONG_REQUEST_TIMEOUT_MS` (5 мин). Раньше лимита не
  было, и зависший сервер держал таблицу в загрузке вечно.
- **`AppError.isTimeout`** — ответа не дождались (статус 0, как при обрыве сети,
  но причина другая). Подпись для него даёт словарь проекта.
- **`QueryHelper.lazyFresh` не повторяет таймаут и 504**: повтор только добавляет
  занятому серверу ещё один тяжёлый запрос.
- **Новый `QueryHelper.liveFresh()`** — для общих очередей, которые меняют другие
  люди: свежо 15 с, перезапрос при открытии экрана и возврате в окно. Остальное —
  как `lazyFresh`. В проекте нужен там, где несколько человек разбирают одно и то же.
- **Ошибка из Blob-ответа разбирается.** Запрос файла (`responseType: 'blob'`)
  получает ошибку тоже Blob-ом; перехватчик читает из него JSON контракта в
  `problem`. Раньше код терялся, и вместо текста по коду был текст по статусу.
- **`Pagination` экспортируется** из `api/types.ts` — общий тип пагинации
  ответа вместо своей копии в каждом ресурсе.
- **Новый тип `Paged<T>`** (`{ data, meta: Pagination }`) в `api/types.ts` — страница списка.
  **`PaginatedResponse3` удалён**: плоских счётчиков в ответах больше нет, в проектах
  он не использовался.
- **Новый `QueryHelper.family(root, key => (...args) => queryOptions({...}))`** —
  запрос одним объявлением: вызов фабрики даёт опции для `useQuery`, `.root` —
  префикс для `invalidateQueries`. Корень — строка или вложенный кортеж
  (`['directories', 'plan-zones']`); фабрика возвращается как есть, так что
  дженерик (`<const I>`) не теряется. Старые вызовы не меняются; в проекте
  нужен там, где ключи кэша живут в фабриках (в Rockwheel — `api/<feature>/*.queries.ts`).

## Тексты и форматы от проекта — `config.ts`

- **Новый `SharedConfig`.** В ядре не осталось строк интерфейса и импортов из
  проекта (`@/services/*`, `@/shared/*`). Проект один раз при старте вызывает
  `SharedConfig.configure({ labels, formatNumber, formatMoney, handleError, reportError? })`;
  без вызова ядро бросает ошибку при первом обращении. Образец — `shared/sharedConfig.ts`
  и вызов в `app.ts` Rockwheel.
- Переехали в `labels`: тексты `ModalCard`, `DateFormInput`, `TableBodyRow`,
  `TablePager` (`pagerRows(count)` отдаёт слово в нужной форме), `DateRange`,
  `FileInput`, `plugins/zod.ts`. `AmountCell`, `MoneyCell`, `TablePager`
  форматируют через `formatNumber`/`formatMoney`; `useSharedAsync` сообщает о сбое
  через `handleError`.

## Модалки — `plugins/modals.plugin.ts`

- **`reg<TResult>()(Component)` вместо `reg<TResult>(Component)`.** Явный первый
  дженерик выключал вывод второго: запись реестра становилась голым `Component`,
  и пропсы в `show()` / `useModal()` были `any` — ошибки в пропсах не ловились.
  Старая форма теперь ошибка компиляции; миграция — `reg<X>(` → `reg<X>()(` во всём
  реестре. Без результата — `reg(Component)` как было.
- **Реестр может быть интерфейсом** (`ModalRegistryShape<R>` вместо
  `Record<string, …>`): проект держит в нижнем слое пустой `interface ModalRegistry`
  и дополняет его из верхнего (declaration merging), чтобы общий код не импортировал
  фичи. Старые реестры-объекты работают как раньше.
- **`close()` завершает `.wait` с `undefined`.** Раньше закрытие крестиком или Esc
  оставляло `.wait` вечно нерешённым. Тип `wait` теперь `Promise<T | undefined>` —
  проверить места, которые ждут ответ (`=== true` работает без изменений).
- **Закрытие окна с несохранённым вводом переспрашивает.**
  `ModalsHelper.createService(registry, { confirmDiscard })`: вопрос с текстом проекта
  (в Rockwheel — `window.confirm('Закрити вікно? Введене не збережеться.')`). Без опции
  окно закрывается сразу, как раньше. `resolve()` закрывает без вопроса.
- **`useModalDirtyGuard(isDirty, options?)`** — «здесь есть несохранённое» для
  состояния вне формы (файлы, выбранные строки). Формы `useMyForm` регистрируются
  сами. Необязательный `{ message, priority }` — текст вопроса и вес: из нескольких
  несохранённых спрашиваем про самое весомое. `confirmDiscard(message?)` может вернуть
  `Promise<boolean>` (своя модалка); синхронный `window.confirm` работает как раньше.
- **`useModalCloseBlocker(isBlocked)`** — пока `true`, окно не закрывается (идёт загрузка).
- **`useModal().setCloseResult(() => result)`** — что отдать в `wait` при закрытии
  без `resolve` (одноразовый пароль уже показан → `true`).
- В `IActiveModal` появились `dirtyChecks`, `dirtyOptions`, `closeBlockers`, `closeResult`.
- **`ModalCard` фокусирует поле с `autofocus`.** Браузер выполняет атрибут раз на
  страницу, и в окнах, открытых позже, он молчал: набранное уходило в никуда.
  Теперь фокус ставит сам `ModalCard` через кадр после монтирования.
- **Горячие клавиши — `@tanstack/vue-hotkeys`, свой `composables/useHotkeys.ts`
  удалён.** В проекте: `npm i -E @tanstack/vue-hotkeys@0.17.0` (бета, версия
  точная); вызовы `useHotkeys({ 'Mod+KeyS': fn })` → `useHotkey('Mod+S', fn)`.
  `BaseModal` сам заводит область модалки (`provideHotkeysContext({ scope: uid })`):
  клавиши внутри окна перекрывают глобальные, Esc закрывает только верхнее окно и
  не трогает окно под открытым дропдауном. Возврата `false` из обработчика больше нет.
- **Анимация закрытия в dev.** Комментарий перед корневым `<div>` в шаблоне `BaseModal` делал корень фрагментом, и `TransitionGroup` убирал окно без анимации (в prod комментарии вырезаются). Комментарий перенесён в `<script>`.

## Формы — `composables/useMyForm.ts`

- **Черновики `persist` убраны** (и в `modals.plugin`: `saveDraft`, `clearDraft`,
  `storageKey`, `persistenceId` в `show`). Черновик жил под именем модалки, а не
  сущности, поэтому набранное для одного водителя подставлялось в форму другого; от
  случайной потери ввода теперь защищает вопрос при закрытии. В проекте: убрать
  `persist` из конфигов форм и `persistenceId` из `modals.show`; восстановления
  набранного после закрытия больше нет.
- **`isDisabled` → `isBusy`** (без псевдонима): «форма занята», а не «невалидна».
  Переименовать в вызовах; кнопку удобно писать `:is-loading="isBusy"`.
- **`isBusy` — только `isSubmitting`, без `meta.pending`.** Поле валидируется на
  blur — ровно в момент нажатия «Зберегти»: кнопка на миг становилась `disabled`
  между mousedown и mouseup, браузер глотал клик, и форма отправлялась только со
  второго нажатия. `handleSubmit` сам дожидается валидации. В проекте менять
  ничего не нужно.
- Регистрирует `meta.dirty` в модалке (см. `useModalDirtyGuard`): закрытие
  заполненной формы переспросит, если проект передал `confirmDiscard`.
- Экспортируется тип `UseMyFormConfig` — для надстроек проекта (в Rockwheel —
  `shared/composables/useAppForm.ts` с политикой ошибок сабмита).

## Поля — `components/ui/inputs/`

- **Новый `TextareaFormInput`** — многострочное поле формы одним тегом
  (`name`, `label`, `rows`, `placeholder`, `hint`, `isRequired`; остальные
  атрибуты — на `<textarea>`). Заменил сырой `<textarea>` в `SmartField`.
- **Новый `CheckboxInput`** — флажок на `v-model` для опций вне формы.
  `CheckboxFormInput` теперь оборачивает его (разметка и стили в одном месте),
  API `CheckboxFormInput` не изменился.
- **`CheckboxFormInput`: снятая галочка — `false`, а не `undefined`** (`unchecked-value`).
  Раньше «поставил → снял» давал `undefined`, схема `z.boolean()` не проходила, а
  ошибку флажок не показывает — форма молча не отправлялась.
- **Новый `PasswordReveal`** — «глазик» показать/скрыть пароль. Обёртка, а не своё
  поле: внутрь кладут любой инпут проекта и отдают ему тип из слота —
  `<PasswordReveal v-slot="{ type }"><input :type="type" v-bind="field" /></PasswordReveal>`
  (или `Input` стартового кита). Тексты — `labels.showPassword/hidePassword`.
- **`DateFormInput` принимает `min`** (YYYY-MM-DD) в пару к `max`: раньше
  календарь не давал выбрать. Необязательный, старые вызовы не меняются.

## Фильтр — `components/ui/FilterSelect.vue`, `filterSelect.types.ts`

- **Удалённый режим** для справочников без предела: `fetchPage(query, page)` →
  `{ items, lastPage }` и `fetchById(value)`. Список грузится при открытии, поиск —
  с паузой 200 мс, дальше «Показать ещё», устаревшие ответы отбрасываются.
  С `options` всё как раньше. Тексты — `labels.loading/loadFailed/retry/loadMore`.

## Таблицы — `components/tables/cells/`, `styles/table.scss`

- **`MoneyCell`, `AmountCell`, `DateTimeCell` не переносятся** (`white-space: nowrap`
  в самой ячейке). Раньше это держалось только на классе таблицы; теперь таблица
  может переносить текст, а сумма и дата пополам не рвутся.
- **Каркас `.t` переехал** из `assets/scss/common/table.scss` в ядро без изменений.
  В проекте: импортировать `@/_shared/styles/table.scss` отдельной точкой входа
  (чтобы additionalData дал токены), старую копию удалить; в `_variables.scss`
  проекта нужны `$table-cell-padding-x` и `$table-cell-padding-y`.

## `helpers/date.helper.ts`

- **Новый `DateHelper.isJSONDate(value)`** — проверка строки `YYYY-MM-DD` на
  настоящую дату (вместо копий регулярки по формам).

## `helpers/form.helper.ts`

- Пример внизу файла больше не пишет `console.log` при каждом импорте.

## Иконки — `@lucide/vue`

- **`lucide-vue-next` → `@lucide/vue`.** Старый пакет помечен в npm как устаревший («Please use @lucide/vue instead»). Ядро импортирует иконки из `@lucide/vue`; в проекте — заменить пакет и импорты, имена иконок те же.
