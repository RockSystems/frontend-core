<script setup lang="ts">
// Поповер кита: тригер + панель. Каркас reka-ui (фокус-трап, Esc, клік повз,
// позиціювання) — свій велосипед тут завжди недоробить a11y.
//
// Тригер віддаємо слотом, а не пропами: кнопкою бувають і UiButton, і чип, і
// іконка, і перелічити їх пропами означало б переписувати компонент під кожен
// новий випадок.

import { PopoverArrow, PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'

withDefaults(defineProps<{
  align?: 'start' | 'center' | 'end'
  side?: 'top' | 'right' | 'bottom' | 'left'
  /** Ширина панелі; не задано — по вмісту. */
  width?: number
  isArrow?: boolean
}>(), {
  align: 'end',
  side: 'bottom',
})

// Відкритість назовні: батьківському тригеру часто треба підсвітитись, поки
// панель відкрита (як у DateRangeField).
const isOpen = defineModel<boolean>('open', { default: false })
</script>

<template>
  <PopoverRoot v-model:open="isOpen">
    <PopoverTrigger as-child>
      <slot name="trigger" :is-open="isOpen" />
    </PopoverTrigger>

    <PopoverPortal>
      <PopoverContent
        class="ui-pop"
        :align="align"
        :side="side"
        :side-offset="6"
        :style="width ? { width: `${width}px` } : undefined"
      >
        <PopoverArrow v-if="isArrow" class="ui-pop__arrow" />
        <slot :close="() => { isOpen = false }" />
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>

<!-- Не scoped: корінь телепортованого контенту scope-атрибута не отримує
     (див. resources/js/CLAUDE.md §9), і фон із тінню просто не застосувались би. -->
<style lang="scss">
.ui-pop {
  z-index: 1000;
  background: $color-surface;
  border: 1px solid $color-border;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.16);

  &__arrow {
    fill: $color-surface;
  }
}
</style>
