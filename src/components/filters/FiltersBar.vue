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
//
// Розкладка — обтікання (float), а не flex: дії стоять у правому верхньому куті,
// перший ряд фільтрів — поруч із ними, решта рядів — на всю ширину. Flex ділить
// на колонки на всю висоту, і під діями лишалась порожнеча, поки фільтри
// тіснились по два в рядку.
//
// Правило для чипа одне: корінь рядковий (inline-flex) — стає в ряд; блоковий
// займає власний рядок на всю ширину (так розкривається панель під кнопкою).

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
    <!-- Дії — першими в розмітці й обтічні праворуч: так вони стоять у куті, а
         фільтри обтікають їх і нижче займають усю ширину. Після фільтрів вони
         стали б у кінці останнього рядка й їздили б разом з ним. -->
    <div v-if="$slots.toolbar" class="filters__tools">
      <slot name="toolbar" />
    </div>

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
  </section>
</template>

<style scoped lang="scss">
.filters {
  // flow-root: картка обіймає обтічні дії, навіть коли фільтрів менше за їхню висоту.
  display: flow-root;
  // Знизу й праворуч поля менші на відступ між фільтрами: його дають поля самих
  // фільтрів (праве — у кінці рядка, нижнє — в останньому рядку). Інакше фільтр,
  // що влазить упритул, переносився б через своє праве поле.
  padding: 12px 4px 2px 16px;
  background: $color-surface;
  border: 1px solid $color-border;
  border-radius: 12px;

  // Кожен фільтр — прямий нащадок картки, свій чи з #chips (тому :deep).
  // Відступи — полями: gap між рядковими елементами не працює.
  > :deep(:not(.filters__tools)) {
    max-width: calc(100% - 12px);
    margin: 0 12px 10px 0;
    vertical-align: middle;
  }

  &__tools {
    float: right;
    display: flex;
    align-items: center;
    gap: 4px;
    // Праве поле повертає діям звичні 16px від краю картки (див. padding).
    margin: 0 12px 10px 12px;
  }

  &__group {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
  }

  // Ширина — забота ряда фильтров, не самого поля (см. UiSearchInput).
  // Фіксована ширина: розтягнутись чи стиснутись під вільне місце в обтіканні
  // нема як. 260px — колишня основа у flex: ширший пошук переносив би сусідів
  // на новий рядок. На вузькому екрані — не ширше картки (max-width вище).
  &__search { width: 260px; }
}

</style>
