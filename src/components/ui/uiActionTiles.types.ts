// Окремим .ts, а не експортом з UiActionTiles.vue: для plain `tsc` `*.vue` — заглушка без іменованих експортів.

import type { LucideIcon } from '@lucide/vue'

export interface UiActionTile {
  icon: LucideIcon
  title: string
  desc: string
  action: () => void
}
