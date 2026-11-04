<script setup lang="ts">
// Скільки всього за фільтром і скільки вже підвантажено — для таблиць
// порціями. Стоїть у першій клітинці рядка підсумків (там, де «Усього: N»),
// а без підсумків — підвалом картки (TableLoadedFooter). Окремий рядок під
// підсумками лише забирав би висоту в таблиці.

import { Loader2 } from '@lucide/vue'
import { SharedConfig } from '../../config'
import { NumberHelper } from '../../helpers/number.helper'

defineProps<{
  /** «Усього», «Водіїв», «Звітів». */
  label: string
  /** Підсумок після підпису — з підсумків бека; null — ще не приїхали. */
  count: number | null
  /** Рядків завантажено і всього за фільтром — для «показано N». */
  loaded: number
  total: number | null
  isLoadingMore: boolean
}>()
const { labels } = SharedConfig.get()
const formatNumber = SharedConfig.get().formatNumber ?? NumberHelper.format
</script>

<template>
  <!-- Поки підсумків немає — порожньо: «Усього: 0» було б неправдою. -->
  <span v-if="count !== null" class="tlc" aria-live="polite">
    <span>{{ label }}: {{ formatNumber(count) }}</span>
    <template v-if="total !== null && loaded < total">
      <span class="tlc__sep" aria-hidden="true">·</span>
      <span class="tlc__loaded">{{ labels.tableShownShort(formatNumber(loaded)) }}</span>
    </template>
    <Loader2 v-if="isLoadingMore" :size="13" class="tlc__spinner" :aria-label="labels.tableLoadingMore" />
  </span>
</template>

<style scoped lang="scss">
// Відступи — лише gap, без пробілів у тексті: інакше з одного боку крапки
// стояв би gap, з другого — пробіл шрифту, і вона зʼїжджала б убік. Частини
// різної ваги рівняємо по базовій лінії, а не по центру.
.tlc {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;

  &__sep,
  &__loaded {
    font-size: inherit;
    font-weight: 400;
    color: $color-muted;
  }

  &__spinner {
    align-self: center;
    color: $color-muted;
    animation: tlc-spin 0.9s linear infinite;
  }
}

@keyframes tlc-spin { to { transform: rotate(360deg); } }
</style>
