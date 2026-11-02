<script setup lang="ts" generic="TValue">
import {Field} from 'vee-validate';
import {useId} from 'vue';
import {SelectItem} from "../../../types/ui/select";

defineProps<{
  label: string;
  name: string;
  items: SelectItem<TValue>[]
}>();

defineEmits(['update:modelValue']);

// id из подписи ломался на пробелах и совпадал у двух форм с одной подписью.
const uid = useId();
</script>

<template>
  <!-- fieldset + legend: читалка называет группу, а не только вариант. -->
  <fieldset class="segmented-control">
    <legend class="segmented-control__legend">{{ label }}</legend>
    <Field :name="name"
           v-slot="{field, errors, handleChange, value}"
    >
      <div class="segmented-control__list">
        <div class="segmented-control__item"
             v-for="item in items"
             :key="item.id"
        >
          <input class="segmented-control__input"
                 type="radio"
                 v-bind="field"
                 :id="`${uid}-${item.id}`"
                 :name="name"
                 :value="item.value"
                 :checked="value === item.value"
                 @change="handleChange(item.value)"
          />
          <label class="segmented-control__label" :for="`${uid}-${item.id}`">
            {{ item.title }}
          </label>
        </div>
      </div>
      <span class="ui-errors" v-if="errors.length">
        <span class="ui-error" v-for="err in errors" :key="err">
          {{ err }}
        </span>
      </span>
    </Field>
  </fieldset>
</template>

<style lang="scss" scoped>
.segmented-control {
  $radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 0;
  border: 0;
  min-inline-size: 0;

  // Как подпись SmartField — поле в форме не должно выделяться размером.
  &__legend {
    padding: 0;
    margin-bottom: 6px;
    font-size: 12px;
    font-weight: 500;
    color: $color-muted;
  }

  &__list {
    display: flex;
    flex-wrap: wrap;
  }

  &__item {
    position: relative;
    flex-grow: 1;
    min-width: min-content;
    max-width: max-content;

    & + & {
      margin-left: -1px;
    }

    &:first-child .segmented-control__label {
      border-top-left-radius: $radius;
      border-bottom-left-radius: $radius;
    }

    &:last-child .segmented-control__label {
      border-top-right-radius: $radius;
      border-bottom-right-radius: $radius;
    }
  }

  // Не display: none — иначе вариант нельзя выбрать с клавиатуры.
  &__input {
    position: absolute;
    opacity: 0;
    width: 1px;
    height: 1px;
    pointer-events: none;
  }

  &__label {
    display: flex;
    padding: 8px 16px;
    border: 1px solid $color-border-strong;
    background: $color-surface;
    color: $color-text;
    font-size: 14px;
    cursor: pointer;
    transition: background-color 120ms ease, border-color 120ms ease;

    &:hover { background: $color-page-bg; }
  }

  &__input:focus-visible + &__label {
    outline: 2px solid $color-accent;
    outline-offset: 1px;
    position: relative;
    z-index: 1;
  }

  &__input:disabled + &__label {
    filter: grayscale(1);
    opacity: .8;
    cursor: not-allowed;
  }

  &__input:checked + &__label {
    position: relative;
    z-index: 1;
    border-color: $color-accent;
    background: $color-accent-dim;
    color: $color-accent-ink;
  }
}
</style>
