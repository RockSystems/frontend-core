<script setup lang="ts" generic="T">
// Skeleton-строки для initial loading: та же сетка колонок, что и у реальных строк.
//
// Выравнивание берём из meta.align колонки — ровно как TableBodyRow/TableHeaderRow.
// Иначе полосы всех колонок липнут влево, а числа после загрузки прыгают вправо.
//
// Живёт в _shared, потому что блок был скопирован в три таблицы (статистика,
// звіти, машини) — правка выравнивания в одной копии разъехалась бы с остальными.

import type {} from '../../types/table'
import type { Column } from '@tanstack/vue-table'

interface Props {
  /**
   * Видимі колонки таблиці (`table.getVisibleLeafColumns()`), а не сирий масив
   * columnDef: у таблиці бувають приховані стовпці (носії сортування складених
   * колонок), і по сирому масиву скелетон малював би зайві комірки.
   */
  columns: Column<T, unknown>[]
  rowsCount: number
  // Резерв под chevron-toggle — см. одноимённый проп TableBodyRow.
  hasLeadingCell?: boolean
}

defineProps<Props>()
</script>

<template>
  <tr v-for="i in rowsCount" :key="`skel-${i}`" class="t__row t__row--skeleton">
    <td v-if="hasLeadingCell" class="t__td t__td--toggle"></td>
    <td
      v-for="col in columns"
      :key="col.id"
      class="t__td"
      :style="col.columnDef.meta?.align ? { textAlign: col.columnDef.meta.align } : undefined"
    >
      <span class="t__skeleton-bar" />
    </td>
  </tr>
</template>
