<script setup lang="ts">
// Підвал нескінченної таблиці без рядка підсумків: скільки показано з усіх за
// фільтром. Де підсумки є, лічильник живе в них (TableLoadedCount).

import { Loader2 } from '@lucide/vue'
import { SharedConfig } from '../../config'
import { NumberHelper } from '../../helpers/number.helper'

defineProps<{
  loaded: number
  /** null — перша порція ще не приїхала: рядка не показуємо. */
  total: number | null
  isLoadingMore: boolean
}>()
const { labels } = SharedConfig.get()
const formatNumber = SharedConfig.get().formatNumber ?? NumberHelper.format
</script>

<template>
  <p v-if="total !== null" class="tlf" aria-live="polite">
    {{ labels.tableShown(formatNumber(loaded), formatNumber(total)) }}
    <Loader2 v-if="isLoadingMore" :size="13" class="tlf__spinner" :aria-label="labels.tableLoadingMore" />
  </p>
</template>

<style scoped lang="scss">
.tlf {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  padding: 8px 12px;
  border-top: 1px solid $color-border;
  background: $color-page-bg;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  color: $color-text;

  &__spinner {
    color: $color-muted;
    animation: tlf-spin 0.9s linear infinite;
  }
}

@keyframes tlf-spin { to { transform: rotate(360deg); } }
</style>
