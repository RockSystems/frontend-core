<script setup lang="ts">
// Универсальный пейджер таблиц: prev/next + "Сторінка X з Y" + select per-page.
// Не привязан к TanStack — принимает плоские пропсы и эмитит изменения.

import { ChevronLeft, ChevronRight } from '@lucide/vue'
import UiIconButton from '../ui/UiIconButton.vue'
import { SharedConfig } from '../../config'
import { NumberHelper } from '../../helpers/number.helper'

interface Props {
  page: number
  pageCount: number
  rowCount: number
  perPage: number
  perPageOptions?: number[]
  canPrev: boolean
  canNext: boolean
}

withDefaults(defineProps<Props>(), {
  perPageOptions: () => [10, 25, 50, 100],
})

const emit = defineEmits<{
  'update:page': [page: number]
  'update:perPage': [perPage: number]
}>()

const { labels } = SharedConfig.get()
const formatNumber = SharedConfig.get().formatNumber ?? NumberHelper.format
</script>

<template>
  <footer class="pager">
    <UiIconButton
      :disabled="!canPrev"
      :aria-label="labels.pagerPrev"
      :title="labels.pagerPrev"
      @click="emit('update:page', page - 1)"
    >
      <ChevronLeft :size="16" />
    </UiIconButton>

    <span class="pager__info">
      {{ labels.pagerPage }} <b>{{ page }}</b> {{ labels.pagerOf }} {{ pageCount }}
      <span class="pager__total">· {{ formatNumber(rowCount) }} {{ labels.pagerRows(rowCount) }}</span>
    </span>

    <UiIconButton
      :disabled="!canNext"
      :aria-label="labels.pagerNext"
      :title="labels.pagerNext"
      @click="emit('update:page', page + 1)"
    >
      <ChevronRight :size="16" />
    </UiIconButton>

    <select
      class="pager__perpage"
      :aria-label="labels.pagerPerPage"
      :value="perPage"
      @change="emit('update:perPage', Number(($event.target as HTMLSelectElement).value))"
    >
      <option v-for="n in perPageOptions" :key="n" :value="n">{{ labels.perPage(n) }}</option>
    </select>
  </footer>
</template>

<style scoped lang="scss">
.pager {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-top: 1px solid $color-border;
  background: $color-page-bg;

  &__info {
    font-size: 13px;
    color: $color-text;
    font-variant-numeric: tabular-nums;
  }

  &__total { color: $color-muted; margin-left: 4px; }

  &__perpage {
    margin-left: auto;
    padding: 4px 8px;
    border: 1px solid $color-border;
    border-radius: $radius;
    background: $color-surface;
    color: $color-text;
    font-size: 12px;
    cursor: pointer;
  }
}
</style>
