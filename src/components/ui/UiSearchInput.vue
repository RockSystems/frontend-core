<script setup lang="ts">
// Поле фільтра: іконка + інпут без власної рамки в спільній пігулці.
// Виглядає як FilterSelect поруч — інакше поле випадає з ряду фільтрів.
//
// Ширину задає батько класом на компоненті (`flex`/`min-width`/`max-width`):
// це питання розкладки конкретного ряду, а не самого поля.
//
// Хрестик чистить поле одним кліком — лише коли є що чистити.

import { SharedConfig } from '../../config'
import { Search, X } from '@lucide/vue'
import type { Component } from 'vue'

withDefaults(defineProps<{
  modelValue: string
  placeholder: string
  icon?: Component
  /** Номер/код: моноширина й капс — символи рівняються і не плутаються. */
  isCode?: boolean
}>(), {
  icon: () => Search,
  isCode: false,
})

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<template>
  <label class="ui-search">
    <component :is="icon" :size="14" />
    <input
      :value="modelValue"
      type="text"
      class="ui-search__input"
      :class="{ 'ui-search__input--code': isCode }"
      :placeholder="placeholder"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <!-- type=button і .prevent: усередині <label> клік інакше пішов би в поле. -->
    <button
      v-if="modelValue"
      type="button"
      class="ui-search__clear"
      :title="SharedConfig.get().labels.clear"
      :aria-label="SharedConfig.get().labels.clearSearch"
      @click.prevent="emit('update:modelValue', '')"
    >
      <X :size="13" />
    </button>
  </label>
</template>

<style scoped lang="scss">
.ui-search {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: $color-page-bg;
  border: 1px solid $color-border;
  border-radius: 8px;
  color: $color-muted;

  &__input {
    flex: 1;
    min-width: 0;
    border: none;
    outline: none;
    background: transparent;
    font-size: 13px;
    color: $color-text;

    &--code {
      font-variant-numeric: tabular-nums;
      letter-spacing: 0.04em;
      text-transform: uppercase;

      // Підказка — людський текст, її капсити не треба.
      &::placeholder {
        text-transform: none;
        letter-spacing: 0;
      }
    }
  }

  &__clear {
    display: inline-flex;
    flex-shrink: 0;
    padding: 2px;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: $color-muted;
    cursor: pointer;

    &:hover {
      color: $color-text;
      background: $color-border;
    }
  }
}
</style>
