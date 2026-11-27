<script setup lang="ts">
// Плашки в комірці (номери автопарку, рахунки): кожна — ціла, не обрізається. Не
// влізли в ширину — переносяться, але не далі трьох рядків: решта ховається за «ще N»,
// клік показує всі у вікні. Колонку з плашками позначають `meta.kind: 'text'` —
// вона бере вільне місце.
//
//   <TableChips><AccountBadge v-for="a in row.accounts" :key="a.id" :account="a" /></TableChips>

import { useResizeObserver } from '@vueuse/core'
import { nextTick, onMounted, onUpdated, ref, useTemplateRef } from 'vue'
import { SharedConfig } from '../../config'
import { columnTitleOf, TableTextState } from './tableText'

/** Скільки рядків плашок видно в комірці. */
const MAX_LINES = 3
const HIDDEN = 't-chips__item--hidden'

const root = useTemplateRef<HTMLElement>('root')
const moreButton = useTemplateRef<HTMLButtonElement>('moreButton')
const hidden = ref(0)
const labels = SharedConfig.get().labels

function items(): HTMLElement[] {
  return [...(root.value?.children ?? [])].filter(
    (item): item is HTMLElement => item instanceof HTMLElement && item !== moreButton.value,
  )
}

const bottomOf = (item: HTMLElement): number => item.offsetTop + item.offsetHeight

// Підбір іде, поки свої ж перемальовки (поява «ще N») викликають onUpdated: без
// цього підбір запускав сам себе без кінця, і сторінка зависала. Наново — лише
// коли змінились плашки чи ширина.
let isFitting = false
let fittedFor = ''

// Що лишається видимим, міряємо самі: CSS обрізав би плашку посередині, а «ще N»
// має стати на останній видимий рядок.
async function fit(): Promise<void> {
  const all = items()
  const signature = `${all.length}:${root.value?.clientWidth ?? 0}`
  if (isFitting || signature === fittedFor) return
  isFitting = true
  try {
    for (const item of all) item.classList.remove(HIDDEN)
    hidden.value = 0
    const first = all[0]
    if (!first) return

    const gap = parseFloat(getComputedStyle(root.value!).rowGap) || 0
    const limit = first.offsetTop + MAX_LINES * first.offsetHeight + (MAX_LINES - 1) * gap + 1
    const over = all.filter(item => bottomOf(item) > limit)
    if (!over.length) return

    for (const item of over) item.classList.add(HIDDEN)
    hidden.value = over.length
    await nextTick()
    // «ще N» сам переніс би рядок — звільняємо йому місце останніми плашками.
    const visible = all.filter(item => !item.classList.contains(HIDDEN))
    while (moreButton.value && bottomOf(moreButton.value) > limit && visible.length > 1) {
      visible.pop()!.classList.add(HIDDEN)
      hidden.value++
      await nextTick()
    }
  } finally {
    fittedFor = signature
    isFitting = false
  }
}

onMounted(fit)
onUpdated(fit)
useResizeObserver(root, () => void fit())

function showAll(): void {
  if (root.value) TableTextState.open({ title: columnTitleOf(root.value), node: root.value })
}
</script>

<template>
  <div ref="root" class="t-chips">
    <slot />
    <!-- Клік по «ще N» — вікно з усіма плашками, а не перехід у рядок. -->
    <button
      v-if="hidden"
      ref="moreButton"
      type="button"
      class="t-chips__more"
      @click.stop="showAll"
    >
      {{ labels.tableMore?.(hidden) ?? `+${hidden}` }}
    </button>
  </div>
</template>

<style lang="scss">
.t-chips {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}

.t-chips__item--hidden {
  display: none;
}

.t-chips__more {
  padding: 0 4px;
  border: 0;
  background: none;
  font: inherit;
  font-size: 12px;
  color: $color-accent;
  cursor: pointer;

  &:hover { text-decoration: underline; }
}
</style>
