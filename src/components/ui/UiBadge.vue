<script setup lang="ts">
// Pill-бейдж застосунку: статуси, типи, прапорці.
//
// Доменів не знає — мапу «статус → tone» тримає хелпер фічі: тільки вона
// розуміє, що `paid` це `done`, а не ще один `success`.
//
// AggregatorBadge сюди не зводиться: у нього дві половини (бренд + стан).

import type { UiBadgeTone } from './uiBadge.types'

withDefaults(defineProps<{
  tone?: UiBadgeTone
  // md — таблиці й картки (11px). sm — щільні комірки (10px).
  // lg — заголовок картки водія, де бейдж стоїть поруч із іменем.
  size?: 'sm' | 'md' | 'lg'
  // Капс тримає бейдж «службовою міткою», а не текстом. Вимикаємо там, де
  // всередині людське слово, яке капсом читається гірше («Паливо», «Штраф»).
  isCaps?: boolean
}>(), {
  tone: 'neutral',
  size: 'md',
  isCaps: true,
})
</script>

<template>
  <span
    class="ui-badge"
    :class="[`ui-badge--${tone}`, `ui-badge--${size}`, { 'ui-badge--caps': isCaps }]"
  >
    <slot />
  </span>
</template>

<style scoped lang="scss">
.ui-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border-radius: 999px;
  white-space: nowrap;
  line-height: 1.4;

  &--caps {
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  &--sm { padding: 2px 8px;  font-size: 10px; font-weight: 700; }
  &--md { padding: 2px 8px;  font-size: 11px; font-weight: 600; }
  &--lg { padding: 4px 12px; font-size: 12px; font-weight: 600; }

  &--neutral { background: $color-neutral-soft; color: $color-neutral-ink; }
  &--success { background: $color-green-soft;   color: $color-green-ink; }
  &--danger  { background: $color-danger-soft;  color: $color-danger-ink; }
  &--warning { background: $color-warning-soft; color: $color-warning-ink; }
  &--info    { background: $color-accent-dim;   color: $color-accent-ink; }
  &--done    { background: $color-teal-soft;    color: $color-teal-ink; }
}
</style>
