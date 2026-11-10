<script setup lang="ts" generic="TPeriod extends Period | null = Period">
// Базовый фильтр таблиц. Встроено: период (DateRangeField — поповер с календарём,
// коммит только по «Застосувати») и опциональный поиск. Вариативное (чипы,
// доп. кнопки) — слоты, период/поиск — через v-model.
//
// Кнопки «Оновити» тут нет: данные тянет vue-query, а руками их обновляют
// перезагрузкой страницы — в ряду фильтров она только занимала место.
//
// mode периода: 'day' (по умолч.) — свободный диапазон; 'week' — прилипает к
// целым неделям (для «Звітів»: агрегаторы точны только в рамках недели).
//
// «{{ SharedConfig.get().labels.resetFilters }}», а не «Очистити все»: те читалось як видалення списку.
// Кнопка є, лише коли є що скидати; чистий стан і скидання знає стор списку
// (useServerList) — з тієї ж схеми адреси, що й перше відкриття.

import { FunnelX } from '@lucide/vue'
import { computed } from 'vue'
import { SharedConfig } from '../../config'
import UiButton from '../ui/UiButton.vue'
import type { Period } from '../../helpers/period.helper'
import UiSearchInput from '../ui/UiSearchInput.vue'
import DateRangeField from './DateRangeField.vue'
import type { PeriodPresetGroups } from '../../helpers/periodPresets.helper'
import type { ResettableFilters } from '../../composables/useServerList'

const props = withDefaults(defineProps<{
  // Опційний: якщо фіча підміняє поле періоду через слот #period (напр. звіти
  // зі своєю обгорткою), проп не потрібен.
  period?: TPeriod
  // Період можна зняти зовсім (списки без дати за замовчуванням).
  isPeriodClearable?: boolean
  periodMode?: 'day' | 'week'
  // Свій набір пресетів періоду (див. DateRangeField). Не задано — дефолт за mode.
  periodPresets?: PeriodPresetGroups
  search?: string
  searchPlaceholder?: string
  /** Фільтри стора (`store.filters`) — для «{{ SharedConfig.get().labels.resetFilters }}». */
  filters?: ResettableFilters
}>(), {
  periodMode: 'day',
})

const emit = defineEmits<{
  'update:period': [period: TPeriod]
  'update:search': [search: string]
}>()

const searchModel = computed<string>({
  get: () => props.search ?? '',
  set: (val) => emit('update:search', val),
})

const showSearch = computed(() => props.searchPlaceholder !== undefined)

</script>

<template>
  <section class="filters">
    <!-- Усі фільтри — один ряд, що переноситься. Роздільних рядів немає
         навмисно: період займає третину ширини, і решта ряду лишалась порожньою,
         поки пошук із дропдаунами тиснулись поверхом нижче. -->
    <div class="filters__main">
      <div v-if="period !== undefined || $slots.period" class="filters__group">
        <!-- Без підпису «Період»: іконка календаря в тригері й так очевидна.
             Поле фіча може підмінити своєю обгорткою (слот #period); дефолт —
             звичайний DateRangeField. -->
        <slot name="period">
          <DateRangeField
            v-if="period !== undefined"
            :period="period"
            :is-clearable="isPeriodClearable"
            :mode="periodMode"
            :presets="periodPresets"
            @update:period="emit('update:period', $event)"
          />
        </slot>
      </div>

      <UiSearchInput
        v-if="showSearch"
        v-model="searchModel"
        class="filters__search"
        :placeholder="searchPlaceholder ?? ''"
      />

      <slot name="chips" />

      <UiButton v-if="filters?.isFiltered" variant="ghost" size="sm" @click="filters.reset()">
        <FunnelX :size="14" />
        {{ SharedConfig.get().labels.resetFilters }}
      </UiButton>
    </div>

    <!-- Дії тримаємо окремим блоком, а не останнім елементом ряду: у ряду з
         переносом `margin-left: auto` притискає вправо лише в межах свого
         рядка, і кнопки їздили б за фільтрами. -->
    <div v-if="$slots.toolbar" class="filters__tools">
      <slot name="toolbar" />
    </div>
  </section>
</template>

<style scoped lang="scss">
.filters {
  display: flex;
  // Не center: коли фільтри переносяться на другий рядок, дії мають лишитись
  // угорі, навпроти періоду, а не поїхати в середину картки.
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  background: $color-surface;
  border: 1px solid $color-border;
  border-radius: 12px;

  &__main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px 12px;
  }

  &__group {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
  }

  &__tools {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    // Вирівнювання по висоті поля періоду, а не по верхньому краю картки.
    padding-top: 2px;
  }

  // Ширина — забота ряда фильтров, не самого поля (см. UiSearchInput).
  // max-width обов'язковий: без нього пошук з'їдав увесь вільний простір ряду
  // і на широкому екрані розтягувався на понад тисячу пікселів.
  // Основа 260px: коли ряд повний, дропдауни переносяться нижче, а пошук не
  // стискається до обрізаної підказки. min-width — лише для вузького екрана,
  // де пошук і так у рядку сам.
  &__search {
    flex: 1 1 260px;
    min-width: 150px;
    max-width: 285px;
  }
}

</style>
