<script setup lang="ts" generic="T">
import { type Row } from '@tanstack/vue-table'

defineProps<{ row: Row<T> }>()
</script>

<template>
  <tr v-if="row.getIsExpanded()" class="t__row t__row--details">
    <td :colspan="row.getVisibleCells().length + 1" class="t__td t__td--details">
      <slot />
    </td>
  </tr>
</template>
