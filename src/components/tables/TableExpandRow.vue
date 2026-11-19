<script setup lang="ts" generic="T">
import { type Row } from '@tanstack/vue-table'
import { TableViewState } from './tableView'

defineProps<{ row: Row<T> }>()
</script>

<template>
  <tr v-if="row.getIsExpanded()" class="t__row t__row--details">
    <td :colspan="TableViewState.cellCount(row.getVisibleCells().map(cell => cell.column)) + 1" class="t__td t__td--details">
      <slot />
    </td>
  </tr>
</template>
