<script setup lang="ts">
// Лічильник біля заголовка секції або вкладки («Авто ⑶»). Не бейдж: несе
// кількість, а не стан, тому без тонів — сірий кружечок з числом.

withDefaults(defineProps<{
  value: number
  /** У вкладках число активне разом із текстом вкладки — тоді темніше. */
  isStrong?: boolean
}>(), { isStrong: false })
</script>

<template>
  <span class="ui-count" :class="{ 'ui-count--strong': isStrong }">{{ value }}</span>
</template>

<style scoped lang="scss">
.ui-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 999px;
  background: $color-page-bg;
  font-size: 11px;
  color: $color-muted;

  &--strong {
    height: 18px;
    color: inherit;
    font-weight: 600;
  }
}
</style>
