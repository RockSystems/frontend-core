<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string
    /** Число (сума, пробіг, кількість): цифри однакової ширини, без переносу. */
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
// Усі значення ліворуч, з однієї вертикалі після колонки підписів — і текст, і
// числа. «Числа праворуч» — правило таблиць: там у колонці одна величина. Тут у
// кожному рядку своя, і значення, що стрибають то вліво, то вправо, читаються гірше.
.ui-details-row {
  display: grid;
  // Ширина колонки підписів: вузька панель задає свою через `--ui-details-label`.
  grid-template-columns: var(--ui-details-label, 12rem) minmax(0, 1fr);
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
