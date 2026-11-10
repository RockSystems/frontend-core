<script setup lang="ts">
import {useField} from 'vee-validate';
import {DateRangeProps} from "./low-level/DateRange.vue";
import DateRange from './low-level/DateRange.vue';

type Props = {
  label: string
  startPath: string
  endPath: string
  isRequired?: boolean
} & DateRangeProps

const props = defineProps<Props>();

const {
  value: startValue,
  errorMessage: startError,
  handleBlur: startBlur
} = useField<Date | undefined>(() => props.startPath);
const {value: endValue, errorMessage: endError, handleBlur: endBlur} = useField<Date | undefined>(() => props.endPath);

/**
 * Обертка для обработки blur.
 * Когда пользователь уходит из любого инпута группы, помечаем оба поля как "touched"
 */
function onBlur() {
  startBlur();
  endBlur();
}
</script>

<template>
  <div class="date-range-form-input">
    <span>
      {{ label }}
      <span v-if="isRequired" class="smart-field__required" aria-hidden="true">*</span>
    </span>
    <DateRange
        v-model:start="startValue"
        v-model:end="endValue"
        :start-label="startLabel"
        :end-label="endLabel"
        :is-inclusive="isInclusive"
        @blur="onBlur"
    />
    <div v-if="startError || endError" class="ui-error">
      {{ startError || endError }}
    </div>
  </div>
</template>

<style scoped lang="scss">
.date-range-form-input {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
