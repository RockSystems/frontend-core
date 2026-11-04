<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string
    /** Рядок на всю ширину — довгий текст (коментар). */
    wide?: boolean
  }>(),
  { wide: false },
)
</script>

<template>
  <div class="ui-details-row" :class="{ 'ui-details-row--wide': wide }">
    <dt>{{ label }}</dt>
    <dd><slot /></dd>
  </div>
</template>

<style lang="scss" scoped>
.ui-details-row {
  display: flex;
  min-width: 0;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.7rem 0;
  border-bottom: 1px solid $color-border;

  dt {
    flex: none;
    color: $color-muted;
  }

  dd {
    min-width: 0;
    margin: 0;
    font-weight: 500;
    text-align: right;
    overflow-wrap: anywhere;
  }
}

.ui-details-row--wide {
  grid-column: 1 / -1;
  flex-direction: column;
  gap: 0.25rem;

  dd {
    text-align: left;
    font-weight: 400;
  }
}

@media (max-width: 760px) {
  .ui-details-row--wide {
    grid-column: auto;
  }
}
</style>
