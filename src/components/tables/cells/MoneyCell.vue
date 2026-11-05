<script setup lang="ts">
// Универсальная денежная ячейка. emphasis рендерит цвет:
//   • 'positive' — наш профит/дохід (green; авто-красный если value < 0 — видно мінусовий дохід)
//   • 'muted'    — расход / нейтрально-серое
//   • 'danger'   — тревожное (red), напр. паливо без каси
//   • undefined  — обычный текст
// null значение → '—'. Tabular numbers для ровных колонок.

import { computed } from 'vue'
import { SharedConfig } from '../../../config'
import { MoneyHelper } from '../../../helpers/money.helper'

interface Props {
  value: number | null
  emphasis?: 'positive' | 'muted' | 'danger'
}

const props = defineProps<Props>()
const formatted = computed(() => props.value === null ? '—' : (SharedConfig.get().formatMoney ?? MoneyHelper.format)(props.value))

// 'positive' зі знаком: дохід >= 0 → зелений, < 0 → червоний.
const tone = computed<'positive' | 'negative' | 'muted' | 'danger' | null>(() => {
  if (props.emphasis === 'positive') {
    return props.value !== null && props.value < 0 ? 'negative' : 'positive'
  }
  return props.emphasis ?? null
})
</script>

<template>
  <span
    class="money"
    :class="{
      'money--positive': tone === 'positive',
      'money--negative': tone === 'negative',
      'money--muted':    tone === 'muted',
      'money--danger':   tone === 'danger',
    }"
  >{{ formatted }}</span>
</template>

<style scoped lang="scss">
.money {
  font-variant-numeric: tabular-nums;
  // Сума й дата не рвуться навпіл, навіть коли таблиця переносить текст.
  white-space: nowrap;
  color: $color-text;

  &--positive { color: $color-green-ink; font-weight: 600; }
  &--negative { color: $color-danger; font-weight: 600; }
  &--muted    { color: $color-muted; }
  &--danger   { color: $color-danger; font-weight: 600; }
}
</style>
