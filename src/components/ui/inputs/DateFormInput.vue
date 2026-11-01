<script setup lang="ts">
import { X } from '@lucide/vue'
import SmartField from "./SmartField.vue";
import { SharedConfig } from '../../../config'

defineProps<{
  label: string,
  name: string,
  // clearable → кнопка × сбрасывает значение в ''.
  clearable?: boolean,
  // Красная звёздочка у подписи. Необязательные поля не помечаем ничем —
  // и уж точно не пишем «необязательно» в label (см. resources/js/CLAUDE.md).
  isRequired?: boolean,
  // Перша й остання дозволені дати (YYYY-MM-DD): поза ними календар не дає вибрати.
  min?: string,
  max?: string,
}>();

const labels = SharedConfig.get().labels
</script>

<template>
  <SmartField
      :name="name"
      :label="label"
      :is-required="isRequired"
      v-slot="{ field, handleChange, inputId }"
  >
    <span class="date-input">
      <input :id="inputId" class="date-input__field" type="date" :min="min" :max="max" v-bind="field"/>
      <button
          v-if="clearable && field.value"
          type="button"
          class="date-input__clear"
          :title="labels.clear"
          @click="handleChange('')"
      >
        <X :size="14"/>
      </button>
    </span>
  </SmartField>
</template>

<style scoped lang="scss">
@use "sass:color" as color;

// Flex-ряд: инпут тянется, × — обычный сосед справа (не оверлей над нативной
// иконкой календаря, чья позиция/ширина зависит от браузера и ОС).
.date-input {
  display: flex;
  align-items: stretch;
  gap: 6px;

  &__field { flex: 1 1 auto; min-width: 0; }

  &__clear {
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;

    border: 1px solid $color-border;
    border-radius: $radius;
    background: $color-surface;
    color: $color-muted;

    transition: background-color 120ms ease, color 120ms ease, border-color 120ms ease;

    &:hover {
      background: $color-page-bg;
      border-color: color.adjust($color-border, $lightness: -6%);
      color: $color-text;
    }
  }
}
</style>
