<script setup lang="ts" generic="TBy extends string">
// Вміст поповера сортування: вертикальний список активних ключів, порядок =
// пріоритет, міняється перетягуванням.
//
// Вертикальний список, а не чипи в ряд: у чипів різна ширина, вони переносяться
// на другий рядок, і тягнути по горизонталі в ціль змінного розміру помітно
// важче. Тут одна вісь руху й однакові за висотою цілі.
//
// Номери пріоритету показуємо, але вводити ними не даємо: цифра — підпис до
// позиції, а не спосіб її задати.

import { SharedConfig } from '../../config'
import { GripVertical, Plus, X } from '@lucide/vue'
import { ReorderGroup, ReorderItem } from 'motion-v'
import { computed } from 'vue'
import UiButton from '../ui/UiButton.vue'
import UiIconButton from '../ui/UiIconButton.vue'
import UiPopover from '../ui/UiPopover.vue'
import type { SortDirection, SortEntry, SortKeyOption } from './sortControl.types'

const props = defineProps<{
  sort: Array<SortEntry<TBy>>
  keys: ReadonlyArray<SortKeyOption<TBy>>
  emptyText: string
}>()

const emit = defineEmits<{ 'update:sort': [value: Array<SortEntry<TBy>>] }>()

const optionOf = (by: TBy) => props.keys.find(key => key.value === by)

// Ключі, яких у стеку ще немає, — меню «Додати». Порожній список ховає кнопку.
const availableKeys = computed(
  () => props.keys.filter(key => !props.sort.some(entry => entry.by === key.value)),
)

function setDirection(by: TBy, direction: SortDirection): void {
  emit('update:sort', props.sort.map(entry => entry.by === by ? { by, direction } : entry))
}

function add(option: SortKeyOption<TBy>): void {
  emit('update:sort', [
    ...props.sort,
    { by: option.value, direction: option.defaultDirection },
  ])
}

function remove(by: TBy): void {
  emit('update:sort', props.sort.filter(entry => entry.by !== by))
}
</script>

<template>
  <div class="sort-panel">
    <p v-if="!sort.length" class="sort-panel__empty">{{ emptyText }}</p>

    <!-- values/@update:values — API ReorderGroup: він сам переставляє масив,
         нам лишається віддати результат назовні. -->
    <ReorderGroup
      v-else
      class="sort-panel__list"
      axis="y"
      :values="sort"
      @update:values="emit('update:sort', $event)"
    >
      <ReorderItem
        v-for="(entry, index) in sort"
        :key="entry.by"
        class="sort-panel__item"
        :value="entry"
        :while-drag="{ scale: 1.03, boxShadow: '0 8px 20px rgba(0,0,0,0.14)' }"
      >
        <!-- Тягнути можна за весь рядок; ручка — підказка, що це можливо. -->
        <GripVertical :size="14" class="sort-panel__grip" />
        <span class="sort-panel__num">{{ index + 1 }}</span>

        <span class="sort-panel__label">{{ optionOf(entry.by)?.label }}</span>

        <span class="sort-panel__dirs">
          <button
            v-for="dir in (['desc', 'asc'] as const)"
            :key="dir"
            type="button"
            class="sort-panel__dir"
            :class="{ 'sort-panel__dir--on': entry.direction === dir }"
            @click="setDirection(entry.by, dir)"
          >
            {{ optionOf(entry.by)?.directions[dir] }}
          </button>
        </span>

        <UiIconButton
          variant="ghost"
          tone="muted"
          :title="SharedConfig.get().labels.sortRemove"
          @click="remove(entry.by)"
        >
          <X :size="14" />
        </UiIconButton>
      </ReorderItem>
    </ReorderGroup>

    <UiPopover v-if="availableKeys.length" align="start">
      <template #trigger>
        <UiButton variant="ghost" size="sm" class="sort-panel__add">
          <Plus :size="14" /> {{ SharedConfig.get().labels.sortAdd }}
        </UiButton>
      </template>

      <template #default="{ close }">
        <div class="sort-panel__menu">
          <button
            v-for="option in availableKeys"
            :key="option.value"
            type="button"
            class="sort-panel__menu-item"
            @click="add(option); close()"
          >
            {{ option.label }}
          </button>
        </div>
      </template>
    </UiPopover>
  </div>
</template>

<style scoped lang="scss">
.sort-panel {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px;
  width: 340px;

  &__empty {
    margin: 0;
    padding: 6px 4px;
    font-size: 12px;
    color: $color-muted;
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    // Список перетягують — свій маркер списку тут лише заважав би.
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 6px 6px 4px;
    background: $color-page-bg;
    border: 1px solid $color-border;
    border-radius: 8px;
    cursor: grab;
    // Курсор тягнення на всьому рядку, але текст усередині не виділяємо —
    // інакше замість перетягування виходить виділення підпису.
    user-select: none;

    &:active { cursor: grabbing; }
  }

  &__grip {
    flex-shrink: 0;
    color: $color-muted;
  }

  &__num {
    flex-shrink: 0;
    width: 16px;
    text-align: center;
    font-size: 11px;
    font-weight: 600;
    color: $color-muted;
    font-variant-numeric: tabular-nums;
  }

  &__label {
    flex: 1;
    min-width: 0;
    font-size: 13px;
    color: $color-text;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__dirs {
    flex-shrink: 0;
    display: inline-flex;
    gap: 2px;
    padding: 2px;
    background: $color-surface;
    border: 1px solid $color-border;
    border-radius: 999px;
  }

  &__dir {
    padding: 2px 8px;
    border: none;
    border-radius: 999px;
    background: none;
    font-size: 11px;
    color: $color-muted;
    white-space: nowrap;

    &:hover { color: $color-text; }

    &--on {
      background: $color-accent;
      color: $color-surface;
    }
  }

  &__add {
    align-self: flex-start;
  }

  &__menu {
    display: flex;
    flex-direction: column;
    padding: 6px;
    min-width: 200px;
  }

  &__menu-item {
    padding: 7px 10px;
    border: none;
    border-radius: 6px;
    background: none;
    font-size: 13px;
    color: $color-text;
    text-align: left;

    &:hover { background: $color-accent-dim; }
  }
}
</style>
