<script setup lang="ts">
// Универсальная числовая ячейка. Число + опциональный suffix ("км", "хв", "поїздок").
// Округление по props (default = 0). null → '—'. Tabular numbers.

import { computed } from 'vue'
import { SharedConfig } from '../../../config'

interface Props {
  value: number | null
  suffix?: string
  // Сколько знаков после запятой. Дефолт 0 (целое).
  precision?: number
  emphasis?: 'positive' | 'muted'
}

const props = withDefaults(defineProps<Props>(), { precision: 0 })

const formatted = computed(() => {
  if (props.value === null) return '—'
  const rounded = props.precision === 0
    ? Math.round(props.value)
    : Number(props.value.toFixed(props.precision))
  const num = SharedConfig.get().formatNumber(rounded)
  return props.suffix ? `${num} ${props.suffix}` : num
})
</script>

<template>
  <span
    class="amount"
    :class="{
      'amount--positive': emphasis === 'positive',
      'amount--muted':    emphasis === 'muted',
    }"
  >{{ formatted }}</span>
</template>

<style scoped lang="scss">
.amount {
  font-variant-numeric: tabular-nums;
  // Сума й дата не рвуться навпіл, навіть коли таблиця переносить текст.
  white-space: nowrap;
  color: $color-text;

  &--positive { color: $color-green-ink; font-weight: 600; }
  &--muted    { color: $color-muted; }
}
</style>
