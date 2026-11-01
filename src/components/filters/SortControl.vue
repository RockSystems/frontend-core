<script setup lang="ts" generic="TBy extends string">
// Мультисортування в ряду фільтрів: одна плашка «тригер + хрестик», як у
// FilterSelect. Геометрія та сама навмисно — у ряду це ще один фільтр, і своя
// форма читалася б як чужий елемент.
//
// Хрестик усередині плашки, а не окремою кнопкою поруч: відірваний він не
// пояснює, що саме скидає.
//
// Компонент нічого не знає про фічу: набір ключів і підписи приходять пропом
// (`keys`), стан — `sort`. Так само підключається на будь-якій сторінці.

import { SharedConfig } from '../../config'
import { ArrowDownUp, X } from '@lucide/vue'
import { computed } from 'vue'
import UiPopover from '../ui/UiPopover.vue'
import SortControlPanel from './SortControlPanel.vue'
import type { SortEntry, SortKeyOption } from './sortControl.types'

const props = withDefaults(defineProps<{
  sort: Array<SortEntry<TBy>>
  keys: ReadonlyArray<SortKeyOption<TBy>>
  /** Підпис порожнього стану в панелі — пояснює, як список іде без сортування. */
  emptyText?: string
}>(), {
  emptyText: () => SharedConfig.get().labels.sortEmpty,
})

const labels = SharedConfig.get().labels

const emit = defineEmits<{ 'update:sort': [value: Array<SortEntry<TBy>>] }>()

const optionOf = (by: TBy) => props.keys.find(key => key.value === by)

// Перший ключ повністю, решта числом: назви всіх трьох у ряд не влізли б, а
// перший і є той, що визначає порядок рядків.
const summary = computed(() => {
  const [first, ...rest] = props.sort
  if (!first) return labels.sortTitle

  const arrow = first.direction === 'asc' ? '↑' : '↓'
  const label = `${optionOf(first.by)?.label ?? first.by} ${arrow}`

  return rest.length ? `${label} +${rest.length}` : label
})

// Повний перелік — у тултипі: «1. Дохід: Спадання · 2. Належність: Спочатку авто парку».
const title = computed(() => props.sort.length
  ? props.sort
    .map((entry, i) => {
      const option = optionOf(entry.by)
      return `${i + 1}. ${option?.label ?? entry.by}: ${option?.directions[entry.direction] ?? entry.direction}`
    })
    .join(' · ')
  : labels.sortEmptyShort,
)
</script>

<template>
  <div class="sort-ctl">
    <UiPopover align="end">
      <template #trigger>
        <button
          type="button"
          class="sort-ctl__trigger"
          :class="{ 'sort-ctl__trigger--filled': sort.length > 0 }"
          :title="title"
        >
          <ArrowDownUp :size="14" class="sort-ctl__icon" />
          <span class="sort-ctl__label">{{ summary }}</span>
        </button>
      </template>

      <SortControlPanel
        :sort="sort"
        :keys="keys"
        :empty-text="emptyText"
        @update:sort="emit('update:sort', $event)"
      />
    </UiPopover>

    <!-- Поза тригером: клік по хрестику не має відкривати панель. -->
    <button
      v-if="sort.length > 0"
      type="button"
      class="sort-ctl__clear"
      :aria-label="labels.sortReset"
      :title="labels.sortReset"
      @click.stop="emit('update:sort', [])"
    >
      <X :size="12" />
    </button>
  </div>
</template>

<style scoped lang="scss">
// Геометрія — копія .fs (FilterSelect): плашка 32px, пігулка, хрестик усередині
// праворуч. Розійдуться — у ряду фільтрів це буде видно одразу.
.sort-ctl {
  position: relative;
  display: inline-flex;
  align-items: center;

  &__trigger {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 32px;
    max-width: 220px;
    padding: 0 10px;
    background: $color-surface;
    border: 1px solid $color-border;
    border-radius: 999px;
    font-size: 12px;
    color: $color-text;
    transition: border-color 0.15s ease, background 0.15s ease;

    &:hover { border-color: rgba(0, 0, 0, 0.2); }

    &:focus-visible {
      outline: none;
      border-color: $color-accent;
      box-shadow: 0 0 0 3px $color-accent-dim;
    }

    // Активне сортування — м'яка заливка, як у заповненого фільтра.
    // padding-right — місце під хрестик, щоб текст під нього не заповзав.
    &--filled {
      padding-right: 26px;
      background: $color-accent-dim;
      border-color: $color-accent;
      color: $color-accent-ink;
    }
  }

  &__icon {
    flex-shrink: 0;
  }

  &__label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__clear {
    position: absolute;
    right: 8px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
    border: none;
    border-radius: 999px;
    background: transparent;
    color: $color-accent-ink;
    opacity: 0.6;

    &:hover { opacity: 1; }
  }
}
</style>
