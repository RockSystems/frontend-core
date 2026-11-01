<script setup lang="ts">
// Дата/время в таблице. Форматирует DateHelper — тут только то, чего он не
// знает: бэк отдаёт время двумя способами.
//   • 'unix' — number (СЕКУНДЫ). Дефолт.
//   • 'iso'  — строка ISO ('2026-04-12T14:30:00+00:00').
// null / битое значение → '—' (это тоже DateHelper).

import { computed } from 'vue'
import { DateHelper } from '../../../helpers/date.helper'

interface Props {
  value: number | string | null
  source?: 'unix' | 'iso'
}

const props = withDefaults(defineProps<Props>(), { source: 'unix' })

const isEmpty = computed(() => props.value === null || props.value === '')

// dayjs (и DateHelper) читают number как МИЛЛИсекунды — переводим.
const formatted = computed(() => DateHelper.formatDateTime(
  props.source === 'unix' && typeof props.value === 'number'
    ? props.value * 1000
    : props.value,
))
</script>

<template>
  <span class="dt" :class="{ 'dt--empty': isEmpty }">{{ formatted }}</span>
</template>

<style scoped lang="scss">
.dt {
  font-variant-numeric: tabular-nums;
  // Сума й дата не рвуться навпіл, навіть коли таблиця переносить текст.
  white-space: nowrap;
  color: $color-text;

  &--empty { color: $color-muted; }
}
</style>
