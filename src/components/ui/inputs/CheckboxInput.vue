<script setup lang="ts">
// Прапорець на v-model — поза формою (опція поруч зі списком). У формі —
// CheckboxFormInput, він обгортає цей самий компонент.
//
// Коробку малюємо саму — preflight Tailwind знімає з контролів рамку, і
// нативний квадратик не видно. Інпут справжній: з нього таб і пробіл.

defineProps<{
  label: string
  /** Через тире після підпису — коротка приписка, не другий рядок. */
  hint?: string | null
}>()

const model = defineModel<boolean>({ required: true })
</script>

<template>
  <label class="checkbox" :class="{ 'checkbox--on': model }">
    <input v-model="model" type="checkbox" class="checkbox__input">
    <span class="checkbox__box" aria-hidden="true" />

    <span class="checkbox__text">
      {{ label }}
      <span v-if="hint" class="checkbox__hint">— {{ hint }}</span>
    </span>
  </label>
</template>

<style scoped lang="scss">
.checkbox {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  font-size: 13px;
  color: $color-text;

  &__input {
    // Не display:none — інпут випав би з таб-порядку.
    position: absolute;
    width: 16px;
    height: 16px;
    margin: 0;
    opacity: 0;
    cursor: pointer;
  }

  &__box {
    position: relative;
    flex: 0 0 auto;
    width: 16px;
    height: 16px;
    // Оптичне вирівнювання по першому рядку тексту, а не по його верху.
    margin-top: 1px;
    border: 1px solid $color-border;
    border-radius: 4px;
    background: $color-surface;
    transition: background-color 0.15s ease, border-color 0.15s ease;
  }

  &--on &__box {
    border-color: $color-accent;
    background: $color-accent;

    &::after {
      content: '';
      position: absolute;
      left: 5px;
      top: 1px;
      width: 4px;
      height: 9px;
      border: solid $color-surface;
      border-width: 0 2px 2px 0;
      transform: rotate(45deg);
    }
  }

  &__text {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0 6px;
  }

  &__hint {
    font-size: 12px;
    color: $color-muted;
  }

  &:focus-within &__box { box-shadow: 0 0 0 3px $color-accent-dim; }
}
</style>
