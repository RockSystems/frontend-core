<script setup lang="ts">
// Прапорець-звуження у рядку фільтрів: «показати лише…». Не пара чипів, бо дія
// одна — звузити вибірку, а вимкнений стан це її відсутність, не другий вибір.
//
// Коробку малюємо саму: preflight Tailwind знімає з контролів рамку, і нативна
// на чипі не показувала стан. Інпут справжній — з нього клавіатура й a11y.

defineProps<{ modelValue: boolean; label: string }>()

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()
</script>

<template>
  <label class="filter-checkbox" :class="{ 'filter-checkbox--active': modelValue }">
    <!-- Значення з пропа, не з DOM: інпут керований, і .checked розійшлося б
         зі стором, щойно батько не прийняв би зміну. -->
    <input
      type="checkbox"
      class="filter-checkbox__input"
      :checked="modelValue"
      @change="emit('update:modelValue', !modelValue)"
    >
    <span class="filter-checkbox__box" aria-hidden="true" />
    {{ label }}
  </label>
</template>

<style scoped lang="scss">
// Форма — та сама, що в сусідніх контролів фільтра: рядок має читатись як ряд.
.filter-checkbox {
  display: inline-flex;
  align-items: center;
  gap: 6px;

  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  border: 1px solid $color-border;
  background: $color-surface;
  color: $color-text;
  cursor: pointer;
  user-select: none;
  transition: all 0.15s ease;

  &:hover { border-color: $color-border-strong; }

  // Не display:none — інпут випав би з таб-порядку й перестав ловити пробіл.
  &__input {
    position: absolute;
    width: 13px;
    height: 13px;
    margin: 0;
    opacity: 0;
    cursor: pointer;
  }

  &__box {
    position: relative;
    flex-shrink: 0;
    width: 13px;
    height: 13px;
    border: 1px solid currentColor;
    border-radius: 3px;
    opacity: 0.6;
    transition: opacity 0.15s ease;
  }

  &--active &__box {
    opacity: 1;

    &::after {
      content: '';
      position: absolute;
      left: 3px;
      top: 0;
      width: 4px;
      height: 8px;
      border: solid currentColor;
      border-width: 0 2px 2px 0;
      transform: rotate(45deg);
    }
  }

  // Білий дрібний текст — на ink, не на $color-accent: яскравий акцент дає < 4,5:1.
  &--active {
    background: $color-accent-ink;
    color: $color-surface;
    border-color: $color-accent-ink;
  }

  // Фокус видно по чипу — сам інпут прозорий. Лише з клавіатури: після кліку рамка заважає.
  &:has(.filter-checkbox__input:focus-visible) {
    outline: 2px solid $color-accent;
    outline-offset: 2px;
  }
}
</style>
