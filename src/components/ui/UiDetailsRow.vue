<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string
    /** Число (сума, пробіг, кількість): праворуч, цифри однакової ширини. */
    numeric?: boolean
    /** Рядок на всю ширину — довгий текст (коментар). */
    wide?: boolean
  }>(),
  { numeric: false, wide: false },
)
</script>

<template>
  <div
    class="ui-details-row"
    :class="{ 'ui-details-row--numeric': numeric, 'ui-details-row--wide': wide }"
  >
    <dt>{{ label }}</dt>
    <dd><slot /></dd>
  </div>
</template>

<style lang="scss" scoped>
// Текст ліворуч, числа праворуч: так суми й кількості порівнюються по розрядах,
// а текст читається з початку рядка. Правило всіх проєктів, не вирівнювати
// все значення в один бік.
.ui-details-row {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 3fr);
  align-items: baseline;
  gap: 1rem;
  min-width: 0;
  padding: 0.7rem 0;
  border-bottom: 1px solid $color-border;

  dt {
    color: $color-muted;
  }

  dd {
    min-width: 0;
    margin: 0;
    font-weight: 500;
    overflow-wrap: anywhere;
  }
}

.ui-details-row--numeric dd {
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.ui-details-row--wide {
  grid-column: 1 / -1;
  grid-template-columns: minmax(0, 1fr);
  gap: 0.25rem;

  dd {
    font-weight: 400;
  }
}
</style>
