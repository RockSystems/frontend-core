# frontend-core

Спільне фронтове ядро кількох проєктів: API-клієнт і обробка помилок, списки й таблиці, форми, модалки, фільтри, кнопки, хелпери. Тільки фронт: Vue, TypeScript, SCSS. PHP тут немає.

Ядро не знає проєктів: ні їхньої мови, ні кольорів, ні структури папок. Усе проєктне приходить через `SharedConfig` і токени стилів.

## Підключення в проєкт

Публічний пакет на npmjs.com, токен для встановлення не потрібен. У `package.json`:

```json
"@rock555/frontend-core": "3.1.0"
```

Імпорти `@/_shared/...` міняти не треба. У `vite.config` один плагін, він дає аліас і все інше, без чого dev-сервер падає на старті:

```ts
import { frontendCore } from '@rock555/frontend-core/vite'

plugins: [frontendCore(), /* ... */],
```

У `tsconfig.json`:

```json
"paths": {
  "@/_shared/*": ["./node_modules/@rock555/frontend-core/src/*"],
  "@/*": ["./resources/js/*"]
}
```

Свою копію `types/table.d.ts` прибрати: типи колонок ядро підключає само.

Залежності ядра (`peerDependencies`) ставить сам проєкт. Необов'язкові: `vis-data` і `vis-timeline` для `TimelineChart`, `vue-sonner` для `ExportButton`, `motion-v` для `SortControlPanel`.

Глобальні стилі ядра проєкт імпортує один раз в `app.ts`: `@/_shared/styles/table.scss` і `@/_shared/styles/toast.scss`.

Підключати конфіг так, щоб `SharedConfig.configure()` спрацював до першого рендера. На рівні модуля читати тексти не можна, це перевіряє `tests/core/config-timing.test.ts`.

## Що проєкт зобов'язаний дати

Через `additionalData` у налаштуваннях SCSS, повний список у [tests/fixtures/_tokens.scss](tests/fixtures/_tokens.scss):

- Поверхні й текст: `$color-page-bg`, `$color-surface`, `$color-border`, `$color-text`.
- `$color-border-strong`: рамки полів, не менше 3:1 до `$color-surface`.
- `$color-muted`: вторинний текст, не менше 4,5:1 до `$color-surface`.
- `$color-accent`: рамки, іконки, заливки без тексту, не менше 3:1.
- `$color-accent-ink`: текст акцентом і заливка під білим текстом, не менше 4,5:1 до `$color-surface` і `$color-accent-dim`.
- `$color-accent-dim`: фон вибраного.
- `$color-green-ink`, `$color-danger`: текст, не менше 4,5:1 до `$color-surface`.
- Бейджі й тости: `$color-green`, `$color-green-soft`, `$color-danger-soft`, `$color-danger-ink`, `$color-warning`, `$color-warning-soft`, `$color-warning-ink`, `$color-neutral-soft`, `$color-neutral-ink`, `$color-teal-soft`, `$color-teal-ink`.
- `$color-selected`, `$color-on-selected`: заливка вибраного (день у календарі, плитка) і текст на ній, не менше 4,5:1.
- Інше: `$radius`, `$table-cell-padding-x`, `$table-cell-padding-y`.
- Міксини: спільні (`bigMobile`, `anim`, `sectionCaption`, `scrollbarStyle`, `$anim-small-time` і брейкпоінти) дає ядро, проєкт лише пересилає їх у своєму `_mixins.scss`: `@forward '@/_shared/styles/mixins' with ($muted: $color-muted);`. Своє тільки `buttonPrimary` (вигляд головної кнопки, бренд проєкту).

Через `SharedConfig.configure()`, повний список у [src/config.ts](src/config.ts):

- `labels`: усі тексти інтерфейсу ядра. Числа й гроші ядро форматує само (`NumberHelper`, `MoneyHelper`); `formatNumber` і `formatMoney` — лише щоб замінити формат.
- `errors`: словник кодів бека, тексти за HTTP-статусом, текст за правилом валідації. Логіка ланцюжка в `errors/apiError.helper`, слова в проєкту.
- `notifyError`: як показати помилку (тост, стор сповіщень, кнопка «Увійти»).
- `link`: компонент посилання для `UiButton`: `{ component: RouterLink, prop: 'to' }` чи `{ component: Link, prop: 'href' }`.
- `goBack`: «Назад» у `UiBackLink`.
- `currentPath` (необов'язково): шлях поточної сторінки для `UiPageTabs`, реактивно. Без нього — `window.location.pathname`.
- `tableDensity` (необов'язково): де тримати щільність таблиць «звичайно / компактно» (`get`, `set`, підписи кнопки). Без нього перемикача немає, другі рядки колонок видно завжди.

Свій варіант кнопки (`<UiButton variant="violet">`) проєкт описує глобально. Селектор `.ui-btn.ui-btn--violet.ui-btn--violet`: scoped-стилі кнопки в ядрі сильніші за один клас.

## Як змінювати ядро

Коду ядра в проєктах немає, тому правити його там нема де. Будь-яка правка йде сюди.

1. Запустіть проєкт на ядрі з папки, правки видно одразу, публікувати нічого не треба:

   ```bash
   CORE_PATH=../frontend-core npm run dev
   ```

   У PowerShell: `$env:CORE_PATH="../frontend-core"; npm run dev`. Шлях рахується від папки, де запускаєте, тож де фронт лежить глибше, це `../../frontend-core`.

2. Відкрийте PR: у ньому нова `version` у `package.json` і запис у [CHANGES.md](CHANGES.md).
   - патч `3.1.1`: виправлення, проєктам нічого робити не треба;
   - мінор `3.2.0`: нова можливість зі значенням за замовчуванням, старе працює як було;
   - мажор `4.0.0`: ламає проєкти (новий обов'язковий токен чи підпис, видалення, зміна поведінки), у `CHANGES.md` пишемо, що зробити проєкту.
3. CI перевіряє типи, лінт, межі ядра, нову версію, а тоді ставить правку в чисті копії всіх проєктів. Червоне в проєкті означає, що правка його ламає. Для мажора це очікувано: перед вами список того, що зробити. Локально те саме: `npm run check` і `npm run check:projects`.
4. Після вливання в `main` пакет і тег з'являються самі, руками нічого не ставимо.
5. Проєкти піднімають версію звичайним PR одразу після виходу:

   ```bash
   npm install --save-exact @rock555/frontend-core@latest
   ```

Само в проєкт нічого не приїде: у `package.json` стоїть точна версія, без `^`, тож ні `npm update`, ні оновлення lock-файлу нової версії не підтягнуть, а невдала публікація нічого не зламає. Відкотитись можна так само, вказавши номер попередньої версії.

Публікація йде лише з CI, без токена. На npm для пакета ввімкнено двофакторну перевірку без обхідних токенів. Назву `release.yml` не міняємо: npm довіряє саме цьому файлу.

## Чого в ядрі бути не може

Це перевіряє `tests/core/boundaries.test.ts`, і CI падає:

- тексти інтерфейсу, вони приходять через `SharedConfig`;
- імпорти `@/` і вихід за межі `src`;
- пакети, яких немає в `peerDependencies`;
- кольори літералами, дозволені лише нейтральні тіні, затемнення під модалкою й білий значок на залитій кнопці;
- стилі, що беруть щось поза контрактом токенів;
- те, що не можна показувати: пакет публічний, тож ні секретів, ні адрес серверів, ні пошти, ні назв проєктів, ні бізнес-логіки. Версію вже могли скачати, тож назад це не забрати.
