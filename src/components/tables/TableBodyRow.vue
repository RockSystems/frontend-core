<script setup lang="ts"  generic="T">
import type {} from '../../types/table'
import { FlexRender } from '@tanstack/vue-table'
import { type Row } from '@tanstack/vue-table'
import { ChevronDown, ChevronRight } from '@lucide/vue'
import UiIconButton from '../ui/UiIconButton.vue'
import { SharedConfig } from '../../config'

defineProps<{
  row: Row<T>
  isLoading?: boolean
  // Таблица резервирует служебную ячейку слева под chevron-toggle.
  // Нужен, когда раскрываются НЕ все строки (getRowCanExpand по условию):
  // ячейка есть всегда — иначе у нераскрываемых строк уедут колонки,
  // а chevron рисуется только там, где раскрывать реально есть что.
  // Если не передан — ячейка появляется по row.getCanExpand() (таблицы,
  // где раскрываются все строки, ничего передавать не обязаны).
  hasLeadingCell?: boolean
}>()

const labels = SharedConfig.get().labels
</script>

<template>
  <tr class="t__row" :class="{ 't__row--loading': isLoading }">
    <!--Служебная toggle-ячейка (+ мерцающий фон-лоадер) — только для раскрываемых
        таблиц. Плоские таблицы не передают hasLeadingCell и не настраивают
        expand → getCanExpand() = false, строка чистая.-->
    <td v-if="hasLeadingCell || row.getCanExpand()"
        class="t__td t__td--toggle"
        :title="row.getCanExpand() ? labels.toggleRowHint : undefined"
    >
      <UiIconButton
        v-if="row.getCanExpand()"
        variant="ghost"
        class="t__expand"
        :title="row.getIsExpanded() ? labels.collapseRow : labels.expandRow"
        @click="row.toggleExpanded()"
      >
        <component :is="row.getIsExpanded() ? ChevronDown : ChevronRight" :size="16" />
      </UiIconButton>
      <span v-if="isLoading" class="t__shimmer" aria-hidden="true" />
    </td>

    <td
      v-for="cell in row.getVisibleCells()"
      :key="cell.id"
      class="t__td"
      :style="cell.column.columnDef.meta?.align ? { textAlign: cell.column.columnDef.meta.align } : undefined"
    >
      <div class="t__cell">
        <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
      </div>
    </td>
  </tr>
</template>

<style scoped lang="scss">
// Контент ячейки тянется на всю ширину td — выравнивание/раскладку дальше
// определяет сам контент (cell-компонент или meta.align колонки из билдера).
.t__cell { width: 100%; }
</style>
