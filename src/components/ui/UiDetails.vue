<script setup lang="ts">
// Дані запису списком «підпис — значення» з тонкими роздільниками. Рядки —
// UiDetailsRow: підписи колонкою однакової ширини, значення ліворуч з однієї вертикалі.
withDefaults(
  defineProps<{
    /** Дві колонки рядків на сторінці; одна — у вузькій панелі. На телефоні завжди одна. */
    columns?: 1 | 2
  }>(),
  { columns: 2 },
)
</script>

<template>
  <dl class="ui-details" :class="{ 'ui-details--single': columns === 1 }"><slot /></dl>
</template>

<style lang="scss" scoped>
.ui-details {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 2rem;
  margin: 0;
}

.ui-details--single {
  grid-template-columns: minmax(0, 1fr);
}

@media (max-width: 760px) {
  .ui-details {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
