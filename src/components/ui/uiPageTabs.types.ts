// Окремим .ts, а не експортом з UiPageTabs.vue: для plain `tsc` `*.vue` — заглушка без іменованих експортів.

export interface UiPageTab {
  label: string
  /** Шлях сторінки: за ним і посилання, і активна вкладка. */
  href: string
  /** Лічильник черги («чекає перевірки»). null/0 — не показуємо. */
  count?: number | null
}
