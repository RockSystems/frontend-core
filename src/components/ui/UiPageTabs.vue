<script setup lang="ts">
// Вкладки розділу поруч із заголовком сторінки: «Водії · Список | Підозріла активність».
//
// Кожна вкладка — окрема адреса, тому це навігація з посиланнями й
// aria-current, а не WAI-ARIA tablist: у вкладок різні дані й права, «Назад» і
// посилання колезі мають працювати. Перемикач у межах однієї сторінки —
// reka-ui Tabs; значення фільтра — UiSegmented.
//
// Вкладки без права проєкт прибирає сам, до передачі сюди: права знає він.
// Лишилась одна вкладка — не малюємо нічого, бо перемикати нема між чим.

import { computed } from 'vue'
import UiCount from './UiCount.vue'
import type { UiPageTab } from './uiPageTabs.types'
import { SharedConfig } from '../../config'

defineProps<{
  items: UiPageTab[]
  /** Назва навігації для скрінрідера. */
  label: string
}>()

const { link, currentPath } = SharedConfig.get()

// Без `currentPath` у конфігу — адреса вкладки браузера: годиться, коли
// сторінка з вкладками перемонтовується на кожен перехід.
const pathname = computed(() => currentPath?.() ?? window.location.pathname)
</script>

<template>
  <nav v-if="items.length > 1" class="ui-page-tabs" :aria-label="label">
    <component
      :is="link.component"
      v-for="tab in items"
      :key="tab.href"
      v-bind="{ [link.prop]: tab.href }"
      class="ui-page-tabs__item"
      :class="{ 'ui-page-tabs__item--active': pathname === tab.href }"
      :aria-current="pathname === tab.href ? 'page' : undefined"
    >
      {{ tab.label }}
      <UiCount v-if="tab.count" :value="tab.count" :is-strong="pathname === tab.href" />
    </component>
  </nav>
</template>

<style scoped lang="scss">
.ui-page-tabs {
  display: flex;
  align-items: center;
  gap: 2px;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar { display: none; }

  &__item {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 8px;
    border: 1px solid transparent;
    border-radius: 7px;
    font-size: 12px;
    line-height: 18px;
    color: $color-muted;
    white-space: nowrap;
    text-decoration: none;
    transition: color 0.15s ease, background 0.15s ease;

    &:hover { color: $color-text; }

    &--active {
      border-color: $color-border;
      background: $color-surface;
      color: $color-text;
      font-weight: 600;
    }
  }
}
</style>
