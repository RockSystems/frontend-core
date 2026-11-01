<script setup lang="ts" generic="T">
// Одиничний вибір фільтра дропдауном: те саме, що FilterSelect без `multiple`,
// але назовні СКАЛЯР, а `null` = «усі» (нічого не обрано).
//
// Заради двох речей. Перша: місця виклику інакше роблять перетворку
// скаляр ↔ масив кожне саме. Друга, важливіша: тристани (VIP, лізинг,
// реферальна) лишались чипами, і на сусідніх панелях один і той самий за
// змістом вибір виглядав двома різними контролами.
//
// Значення можуть бути будь-якими, включно з boolean: усередину FilterSelect
// їде рядковий ключ, назад — вихідне значення з `options`.
//
// Опцію «Усі» в список НЕ кладемо — це `placeholder` (він же назва фільтра).

import { computed } from 'vue'
import FilterSelect from './FilterSelect.vue'

interface Option<V> {
  value: V
  label: string
  /** Коротка назва для підпису кнопки (у списку показується повний label). */
  short?: string
}

const props = defineProps<{
  modelValue: T | null
  options: Array<Option<T>>
  placeholder: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: T | null]
}>()

const keyOf = (value: T): string => String(value)

const selected = computed<string[]>(() =>
  props.modelValue === null ? [] : [keyOf(props.modelValue)],
)

const items = computed(() => props.options.map(option => ({
  value: keyOf(option.value),
  label: option.label,
  short: option.short,
})))

// Повторний клік по обраному пункту знімає вибір — це й є «усі».
function onChange(next: string[]): void {
  const option = props.options.find(item => keyOf(item.value) === next[0])

  emit('update:modelValue', option ? option.value : null)
}
</script>

<template>
  <FilterSelect
    :model-value="selected"
    :options="items"
    :placeholder="placeholder"
    :search-placeholder="searchPlaceholder"
    :empty-text="emptyText"
    :disabled="disabled"
    @update:model-value="onChange"
  />
</template>
