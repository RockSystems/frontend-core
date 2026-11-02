# frontend-core

Спільне фронтове ядро Rockwheel, Rockstaff і TIR: API-клієнт і обробка помилок, списки й таблиці, форми, модалки, фільтри, кнопки, хелпери. Тільки фронт: Vue, TypeScript, SCSS. PHP тут немає.

Ядро не знає проєктів: ні їхньої мови, ні кольорів, ні структури папок. Усе проєктне приходить через `SharedConfig` і токени стилів.

## Підключення в проєкт

Приватний npm-пакет у GitHub Packages. У `package.json`:

```json
"@rocksystems/frontend-core": "^2.0.0"
```

Поруч із `package.json` файл `.npmrc`, сам токен у нього не пишемо:

```
@rocksystems:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NPM_TOKEN}
```

Токен один: GitHub classic token з правом `read:packages`, у змінній `NPM_TOKEN` усюди, де виконується `npm ci`:

- локально: змінна середовища розробника;
- GitHub Actions: секрет `NPM_TOKEN`;
- Docker: секрет збірки `npm_token`, у Dokploy змінна `NPM_TOKEN` проєкту. У Dockerfile `RUN --mount=type=secret,id=npm_token,env=NPM_TOKEN npm ci`, тож токен не лишається в образі.

Імпорти `@/_shared/...` міняти не треба, досить аліаса. У `vite.config`:

```ts
resolve: {
  alias: {
    '@/_shared': fileURLToPath(new URL('./node_modules/@rocksystems/frontend-core/src', import.meta.url)),
    '@': fileURLToPath(new URL('./resources/js', import.meta.url)),
  },
  dedupe: ['vue'],
},
// Без цього dev-сервер збирає ядро окремою копією, і застосунок падає на старті.
optimizeDeps: { exclude: ['@/_shared'] },
```

Аліас `@/_shared` має стояти раніше за `@`. У `tsconfig.json`:

```json
"paths": {
  "@/_shared/*": ["./node_modules/@rocksystems/frontend-core/src/*"],
  "@/*": ["./resources/js/*"]
}
```

Свою копію `types/table.d.ts` прибрати: типи колонок ядро підключає само.

Залежності ядра (`peerDependencies`) ставить сам проєкт. Необов'язкові: `vis-data` і `vis-timeline` для `TimelineChart`, `vue-sonner` для `ExportCsvButton`, `motion-v` для `SortControlPanel`.

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
- Бейджі: `$color-green`, `$color-green-soft`, `$color-danger-soft`, `$color-danger-ink`, `$color-warning-soft`, `$color-warning-ink`, `$color-neutral-soft`, `$color-neutral-ink`, `$color-teal-soft`, `$color-teal-ink`.
- `$color-selected`, `$color-on-selected`: заливка вибраного (день у календарі, плитка) і текст на ній, не менше 4,5:1.
- Інше: `$radius`, `$anim-small-time`, `$table-cell-padding-x`, `$table-cell-padding-y`.
- Міксини: `scrollbarStyle`, `bigMobile` і `buttonPrimary` (вигляд головної кнопки, бренд проєкту).

Через `SharedConfig.configure()`, повний список у [src/config.ts](src/config.ts):

- `labels`: усі тексти інтерфейсу ядра, `formatNumber`, `formatMoney`.
- `errors`: словник кодів бека, тексти за HTTP-статусом, текст за правилом валідації. Логіка ланцюжка в `errors/apiError.helper`, слова в проєкту.
- `notifyError`: як показати помилку (тост, стор сповіщень, кнопка «Увійти»).
- `link`: компонент посилання для `UiButton`: `{ component: RouterLink, prop: 'to' }` чи `{ component: Link, prop: 'href' }`.
- `goBack`: «Назад» у `UiBackLink`.

Свій варіант кнопки (`<UiButton variant="violet">`) проєкт описує глобально. Селектор `.ui-btn.ui-btn--violet.ui-btn--violet`: scoped-стилі кнопки в ядрі сильніші за один клас.

## Як змінювати ядро

1. Правка йде PR-ом сюди, а не в папку проєкту. Перевірити її в себе: `npm link` або `"file:../frontend-core"` замість версії, у PR проєкту це не потрапляє.
2. CI ганяє типи, лінт і межі ядра. Локально те саме: `npm run check`.
3. Після вливання піднімаємо `version` у `package.json`, пишемо в [CHANGES.md](CHANGES.md) і ставимо тег `v…`: CI сам публікує пакет.
   - патч `1.0.1`: виправлення, проєктам нічого робити не треба;
   - мінор `1.1.0`: нова можливість, зі значенням за замовчуванням, старе працює як було;
   - мажор `2.0.0`: ламає проєкти (новий обов'язковий токен чи підпис, видалення, зміна поведінки), у `CHANGES.md` пишемо, що зробити проєкту.
4. Проєкт піднімає версію у себе звичайним PR, коли йому зручно: його CI перевіряє, відповідальний вливає.

## Як оновлення доходить до проєктів

Само нічого не приїде: версія зафіксована в `package-lock.json` проєкту. Коли виходить нова версія, бот (Dependabot або Renovate) відкриває в кожному проєкті PR на неї, тож про оновлення ніхто не забуде. Вручну: `npm install @rocksystems/frontend-core@latest`.

Відставати на мажор і більше дуже небажано, хоч і не заборонено: чим більший розрив, тим дорожче потім наздоганяти.

## Чого в ядрі бути не може

Це перевіряє `tests/core/boundaries.test.ts`, і CI падає:

- тексти інтерфейсу, вони приходять через `SharedConfig`;
- імпорти `@/` і вихід за межі `src`;
- пакети, яких немає в `peerDependencies`;
- кольори літералами, дозволені лише нейтральні тіні, затемнення під модалкою й білий значок на залитій кнопці;
- стилі, що беруть щось поза контрактом токенів.
