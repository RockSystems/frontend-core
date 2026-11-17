<script setup lang="ts" generic="TValue">
// Список форми. Порожній пункт підписаний, інакше людина бачить пусте поле й не розуміє,
// що це «не вказано» і що ним можна скинути вибір. В обов'язковому полі це підказка,
// яку назад не обрати. Тексти — з конфігу проєкту (`labels.select`) або `placeholder`.
import { computed } from 'vue'
import SmartField from "./SmartField.vue";
import {SelectItem} from "../../../types/ui/select";
import { SharedConfig } from '../../../config'

const props = defineProps<{
  label: string,
  name: string,
  items: SelectItem<TValue>[],
  isRequired?: boolean,
  /** Свій текст порожнього пункту замість спільного з конфігу: «Оберіть категорію». */
  placeholder?: string,
}>();

const emptyText = computed(() => {
  const texts = SharedConfig.get().labels.select
  return props.placeholder ?? (props.isRequired ? texts?.choose : texts?.empty) ?? ''
})

const isEmpty = (value: unknown): boolean => value === undefined || value === null || value === ''
</script>

<template>
  <SmartField
      :name="name"
      :label="label"
      :is-required="isRequired"
      v-slot="{ field, handleChange }"
  >
    <select
        v-bind="field"
        :class="{ 'select-input--empty': isEmpty(field.value) }"
        @change="(e) => {
          const val = (e.target as HTMLSelectElement).value;
          handleChange(val === '' ? undefined : val);
        }"
    >
      <option value="" selected :disabled="isRequired">{{ emptyText }}</option>
      <option v-for="item in items" :key="item.id" :value="item.value">
        {{ item.title }}
      </option>
    </select>
  </SmartField>
</template>

<style scoped lang="scss">
// Порожнє значення сіре, як підказка в полі; пункти списку — звичайним кольором.
.select-input--empty {
  color: $color-muted;

  option { color: $color-text; }
}
</style>
