<script setup lang="ts" generic="TItem">
// Вибір зі серверним пошуком: поле, стани, список.
//
// Один каркас на всі пікери (реферал, авто для водія, водій для авто): стани
// «почніть вводити / помилка / шукаємо / нічого» і прокрутка списку в копіях
// розходилися б текстами й відступами. Що в рядку і що робить кнопка — вирішує
// споживач слотом `#item`.

import { SharedConfig } from '../config'
import UiSearchInput from './ui/UiSearchInput.vue'

defineProps<{
  items: TItem[]
  itemKey: (item: TItem) => string
  placeholder: string
  /** Поки нічого не ввели. Список навмисно не показуємо: «перші двадцять» марні. */
  isIdle: boolean
  isLoading: boolean
  isError: boolean
  idleText: string
  emptyText: string
  errorText: string
  /** Скільки збігів на беку. Більше, ніж показано, — просимо уточнити запит. */
  total?: number
}>()

defineSlots<{ item(props: { item: TItem }): unknown }>()

const draft = defineModel<string>('draft', { required: true })
const labels = SharedConfig.get().labels
</script>

<template>
  <UiSearchInput v-model="draft" :placeholder="placeholder" />

  <p v-if="isIdle" class="picker__state">{{ idleText }}</p>
  <p v-else-if="isError" class="picker__state picker__state--error">{{ errorText }}</p>
  <p v-else-if="isLoading && !items.length" class="picker__state">{{ labels.searching }}</p>
  <p v-else-if="!items.length" class="picker__state">{{ emptyText }}</p>

  <template v-else>
    <ul class="picker">
      <li v-for="item in items" :key="itemKey(item)" class="picker__item">
        <slot name="item" :item="item" />
      </li>
    </ul>

    <p v-if="total !== undefined && total > items.length" class="picker__state">
      {{ labels.searchTruncated(items.length, total) }}
    </p>
  </template>
</template>

<style scoped lang="scss">
.picker {
  display: flex;
  flex-direction: column;
  gap: 4px;

  margin: 0;
  padding: 0;
  list-style: none;

  max-height: 45vh;
  overflow-y: auto;

  &__item {
    display: flex;
    align-items: center;
    gap: 10px;

    padding: 4px 0;
    font-size: 13px;
  }

  &__state {
    margin: 0;
    font-size: 13px;
    color: $color-muted;

    &--error { color: $color-danger; }
  }
}
</style>
