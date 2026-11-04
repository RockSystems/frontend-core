<script setup lang="ts">
// Дані запису списком «підпис — значення», як налаштування в Telegram: дві
// колонки рядків з тонкими роздільниками. Рядки — UiDetailsRow.
</script>

<template>
  <dl class="ui-details"><slot /></dl>
</template>

<style lang="scss" scoped>
.ui-details {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 2rem;
  margin: 0;
}

@media (max-width: 760px) {
  .ui-details {
    grid-template-columns: 1fr;
  }
}
</style>
