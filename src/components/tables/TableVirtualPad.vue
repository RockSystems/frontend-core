<script setup lang="ts">
// Розпірка на місці невідмальованих рядків віртуалізованої таблиці: смуга
// прокрутки лишається чесною (useVirtualTable).

defineProps<{ height: number; colspan: number }>()
</script>

<template>
  <tr v-if="height > 0" aria-hidden="true">
    <td :colspan="colspan" class="tvp" :style="{ height: `${height}px` }" />
  </tr>
</template>

<style scoped lang="scss">
.tvp { padding: 0; border: 0; }
</style>
