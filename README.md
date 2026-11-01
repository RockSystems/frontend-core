# frontend-core

Спільне фронтове ядро Rockwheel, Rockstaff і TIR: API-клієнт і помилки, таблиці, форми, модалки, фільтри, хелпери. Тільки фронт: Vue, TypeScript, SCSS. PHP тут немає.

Ядро не знає проєктів: ні їхньої мови, ні кольорів, ні структури папок. Усе проєктне приходить через `SharedConfig` і токени стилів.

## Підключення в проєкт

Репозиторій приватний, тож для встановлення потрібен доступ до нього, зокрема в CI і під час збірки на сервері.

```json
"@rocksystems/frontend-core": "github:RockSystems/frontend-core#v1.0.0"
```

Імпорти `@/_shared/...` міняти не треба, досить аліаса. У `vite.config`:

```ts
resolve: {
  alias: {
    '@/_shared': fileURLToPath(new URL('./node_modules/@rocksystems/frontend-core/src', import.meta.url)),
    '@': fileURLToPath(new URL('./resources/js', import.meta.url)),
  },
  dedupe: ['vue'],
}
```

Аліас `@/_shared` має стояти раніше за `@`. У `tsconfig.json`:

```json
"paths": {
  "@/_shared/*": ["./node_modules/@rocksystems/frontend-core/src/*"],
  "@/*": ["./resources/js/*"]
}
```

Також додати в `include` файл `node_modules/@rocksystems/frontend-core/src/types/table.d.ts`, а свою копію `types/table.d.ts` прибрати.

Залежності ядра (`peerDependencies`) ставить сам проєкт. `vis-data` і `vis-timeline` потрібні лише тим, хто бере `TimelineChart`.

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
- Інше: `$radius`, `$anim-small-time`, `$table-cell-padding-x`, `$table-cell-padding-y`, міксини `scrollbarStyle` і `bigMobile`.

Тексти й формати проєкт задає через `SharedConfig.configure()`, список у [src/config.ts](src/config.ts).

## Як змінювати ядро

1. Правка йде PR-ом сюди, а не в папку проєкту. Перевірити її в себе: `npm link` або `"file:../frontend-core"` замість версії, у PR проєкту це не потрапляє.
2. CI ганяє типи, лінт і межі ядра. Локально те саме: `npm run check`.
3. Після вливання ставимо тег і запис у [CHANGES.md](CHANGES.md):
   - патч `1.0.1`: виправлення, проєктам нічого робити не треба;
   - мінор `1.1.0`: нова можливість, зі значенням за замовчуванням, старе працює як було;
   - мажор `2.0.0`: ламає проєкти (новий обов'язковий токен чи підпис, видалення, зміна поведінки), у `CHANGES.md` пишемо, що зробити проєкту.
4. Проєкт піднімає версію у себе звичайним PR, коли йому зручно: його CI перевіряє, відповідальний вливає.

## Як оновлення доходить до проєктів

Само нічого не приїде: версія зафіксована в `package.json` проєкту. Коли з'являється новий тег, бот відкриває в кожному проєкті PR на нову версію, тож про оновлення ніхто не забуде.

Відставати на мажор і більше дуже небажано, хоч і не заборонено: чим більший розрив, тим дорожче потім наздоганяти.

## Чого в ядрі бути не може

Це перевіряє `tests/core/boundaries.test.ts`, і CI падає:

- тексти інтерфейсу, вони приходять через `SharedConfig`;
- імпорти `@/` і вихід за межі `src`;
- пакети, яких немає в `peerDependencies`;
- кольори літералами, дозволені лише нейтральні тіні, затемнення під модалкою й білий значок на залитій кнопці;
- стилі, що беруть щось поза контрактом токенів.
