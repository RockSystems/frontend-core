<script setup lang="ts" generic="TPeriod extends Period | null = Period">
// Єдине поле вибору періоду для всіх фільтрів. Замість двох нативних
// <input type="date"> + дебаунс — одне поле-тригер, що відкриває поповер із
// календарем + пресетами. Ключове: вибір усередині — ЧЕРНЕТКА, назовні нічого
// не летить, поки не натиснуто «Застосувати». Це прибирає стрибок «почав
// міняти початок — а воно вже відправило запит».
//
// mode:
//   day  — вільний діапазон (статистика/платежі): будь-які start/end, але
//          застосувати можна лише коли обрані ОБИДВА кінці.
//   week — вибір прилипає до цілих тижнів (Пн–Вс) для звітів: агрегатори дають
//          точні суми лише в межах тижня. Пресети-місяці — теж дозволені.

import { SharedConfig } from '../../config'
import { today, getLocalTimeZone, type DateValue } from '@internationalized/date'
import { CalendarRange, Check, ChevronLeft, ChevronRight, X } from '@lucide/vue'
import {
  PopoverContent,
  PopoverPortal,
  PopoverRoot,
  PopoverTrigger,
  RangeCalendarCell,
  RangeCalendarCellTrigger,
  RangeCalendarGrid,
  RangeCalendarGridBody,
  RangeCalendarGridHead,
  RangeCalendarGridRow,
  RangeCalendarHeadCell,
  RangeCalendarRoot,
  type DateRange,
} from 'reka-ui'
import { computed, ref, shallowRef, watch } from 'vue'
import type { Period } from '../../helpers/period.helper'
import { CalendarRangeHelper } from '../../helpers/calendarRange.helper'
import {
  PeriodPresetsHelper,
  type PeriodPreset,
  type PeriodPresetGroups,
} from '../../helpers/periodPresets.helper'

const props = withDefaults(defineProps<{
  // null — період не обрано («усі дати»): списку без обовʼязкової дати нічого
  // підставляти за замовчуванням.
  period: TPeriod
  // Підпис тригера, коли період не обрано.
  emptyLabel?: string
  // Хрестик поруч із полем знімає період (emit null).
  isClearable?: boolean
  mode?: 'day' | 'week'
  // Свій набір пресетів (напр. звіти: тиждень/місяць/квартал/рік). Не задано —
  // дефолтний за mode.
  presets?: PeriodPresetGroups
  // Тригер тягнеться на всю доступну ширину (напр. у модалці в один рядок з кнопкою).
  block?: boolean
}>(), {
  mode: 'day',
})

const labels = SharedConfig.get().labels

const emit = defineEmits<{ 'update:period': [period: TPeriod] }>()

const EMPTY_RANGE: DateRange = { start: undefined, end: undefined }

function toRange(period: Period | null): DateRange {
  return period ? CalendarRangeHelper.toRange(period) : { ...EMPTY_RANGE }
}

const isOpen = ref(false)
// Чернетка вибору. Комітиться лише «Застосувати» / кліком по пресету.
const draft = shallowRef<DateRange>(toRange(props.period))
// Місяць, який показує календар. Керується стрілками шапки + сіткою років/місяців.
const placeholder = shallowRef<DateValue>(
  CalendarRangeHelper.toCalendarDate(props.period?.from) ?? today(getLocalTimeZone()),
)
// Навігація як у нативному пікері: заголовок-кнопка перемикає вигляд
// days → years → (клік по року) → months → (клік по місяцю) → days. Без дропдаунів.
type PickerView = 'days' | 'months' | 'years'
const pickerView = ref<PickerView>('days')

// Відкриття — завжди зі свіжого зовнішнього значення (скидає недокручену
// чернетку від минулого разу) + вертаємо календар на місяць початку періоду.
watch(isOpen, (open) => {
  if (open) {
    draft.value = toRange(props.period)
    placeholder.value = CalendarRangeHelper.toCalendarDate(props.period?.from) ?? today(getLocalTimeZone())
    pickerView.value = 'days'
  }
})

// Пресети: свій набір або дефолтний за mode.
const presetGroups = computed<PeriodPresetGroups>(() =>
  props.presets ?? (props.mode === 'week' ? PeriodPresetsHelper.week() : PeriodPresetsHelper.day()),
)

// --- Сітка вибору місяця/року ------------------------------------------------
const YEARS_PER_PAGE = 12
const MONTH_LONG_FMT = new Intl.DateTimeFormat('uk-UA', { month: 'long' })
const MONTH_SHORT_FMT = new Intl.DateTimeFormat('uk-UA', { month: 'short' })
const NOW_YEAR = new Date().getFullYear()
const NOW_MONTH = new Date().getMonth() + 1

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const monthItems = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: capitalize(MONTH_SHORT_FMT.format(new Date(2020, i, 1))),
}))

// Сторінка з 12 років навколо плейсхолдера (рівний тайлінг від 2000, без стелі/підлоги).
const yearsPageStart = computed(() => {
  const y = placeholder.value.year
  return y - (((y - 2000) % YEARS_PER_PAGE) + YEARS_PER_PAGE) % YEARS_PER_PAGE
})
const yearItems = computed(() =>
  Array.from({ length: YEARS_PER_PAGE }, (_, i) => yearsPageStart.value + i),
)

// Підпис місяця для конкретної сітки днів ("Травень 2026").
function monthLabel(d: DateValue): string {
  return `${capitalize(MONTH_LONG_FMT.format(new Date(d.year, d.month - 1, 1)))} ${d.year}`
}

const headingLabel = computed(() => {
  const p = placeholder.value
  if (pickerView.value === 'years') return `${yearsPageStart.value} – ${yearsPageStart.value + YEARS_PER_PAGE - 1}`
  if (pickerView.value === 'months') return String(p.year)
  // Days: сам місяць підписаний під кожною сіткою — тут показуємо лише рік(и),
  // це заодно вхід у вибір року. Роки різні (грудень-січень) — діапазон.
  const b = p.add({ months: 1 })
  return p.year === b.year ? String(p.year) : `${p.year} – ${b.year}`
})

function toggleView(): void {
  pickerView.value = pickerView.value === 'days' ? 'years' : 'days'
}

// Стрілки: гортають місяць / рік / сторінку років — залежно від вигляду.
function nav(dir: 1 | -1): void {
  const p = placeholder.value
  const step = pickerView.value === 'years'
    ? { years: YEARS_PER_PAGE }
    : pickerView.value === 'months'
      ? { years: 1 }
      : { months: 1 }
  placeholder.value = dir === 1 ? p.add(step) : p.subtract(step)
}

function pickYear(year: number): void {
  placeholder.value = placeholder.value.set({ year })
  pickerView.value = 'months'
}

function pickMonth(month: number): void {
  placeholder.value = placeholder.value.set({ month })
  pickerView.value = 'days'
}

const triggerLabel = computed(() => props.period ? CalendarRangeHelper.label(props.period) : props.emptyLabel ?? labels.allDates)

const draftPeriod = computed(() => CalendarRangeHelper.toPeriod(draft.value))
const isApplyDisabled = computed(() => draftPeriod.value === null)

// week-режим: докручуємо вибір до цілих тижнів на кожній зміні календаря.
function onCalendarUpdate(range: DateRange): void {
  draft.value = props.mode === 'week' ? CalendarRangeHelper.snapToWeeks(range) : range
}

// Пресет — однозначний повний період: застосовуємо одразу й закриваємо.
function applyPreset(preset: PeriodPreset): void {
  emit('update:period', preset.make() as TPeriod)
  isOpen.value = false
}

function apply(): void {
  const next = draftPeriod.value
  if (!next) return

  // Ті самі дати — той самий вибір: відносний пресет не стає конкретними датами.
  const current = props.period
  const isSame = current !== null && current.from === next.from && current.to === next.to
  emit('update:period', (isSame ? current : next) as TPeriod)
  isOpen.value = false
}

function clear(): void {
  draft.value = { start: undefined, end: undefined }
}
</script>

<template>
  <span class="drf" :class="{ 'drf--block': block }">
  <PopoverRoot v-model:open="isOpen">
    <PopoverTrigger
      class="drf-trigger"
      :class="{ 'drf-trigger--open': isOpen, 'drf-trigger--block': block, 'drf-trigger--empty': !period }"
    >
      <CalendarRange :size="14" />
      <span class="drf-trigger__label">{{ triggerLabel }}</span>
    </PopoverTrigger>

    <PopoverPortal>
      <PopoverContent align="start" :side-offset="6" class="drf-pop">
        <div class="drf-body">
          <!-- Пресети (згруповані). Порожній набір (напр. у модалці) — колонку
               ховаємо, лишається сам календар. -->
          <div v-if="presetGroups.length" class="drf-presets">
            <template v-for="(group, gi) in presetGroups" :key="gi">
              <div v-if="gi > 0" class="drf-presets__sep" />
              <button
                v-for="preset in group"
                :key="preset.label"
                type="button"
                class="drf-presets__item"
                @click="applyPreset(preset)"
              >
                {{ preset.label }}
              </button>
            </template>
          </div>

          <!-- Календар -->
          <RangeCalendarRoot
            v-slot="{ weekDays, grid }"
            :model-value="draft"
            :placeholder="placeholder"
            :week-starts-on="CalendarRangeHelper.WEEK_STARTS_ON"
            weekday-format="short"
            locale="uk"
            :number-of-months="2"
            fixed-weeks
            class="drf-cal"
            :class="`drf-cal--${mode}`"
            @update:model-value="onCalendarUpdate"
            @update:placeholder="placeholder = $event"
          >
            <!-- Шапка: стрілки + заголовок-кнопка. Клік по заголовку відкриває
                 сітку років → місяців (як окремий екран у нативному пікері). -->
            <div class="drf-cal__header">
              <button type="button" class="drf-cal__nav" @click="nav(-1)">
                <ChevronLeft :size="16" />
              </button>
              <button type="button" class="drf-cal__title" @click="toggleView">
                {{ headingLabel }}
              </button>
              <button type="button" class="drf-cal__nav" @click="nav(1)">
                <ChevronRight :size="16" />
              </button>
            </div>

            <!-- Сітка років -->
            <div v-if="pickerView === 'years'" class="drf-cal__pick">
              <button
                v-for="y in yearItems"
                :key="y"
                type="button"
                class="drf-cal__pick-item"
                :class="{ 'is-active': y === placeholder.year, 'is-now': y === NOW_YEAR }"
                @click="pickYear(y)"
              >
                {{ y }}
              </button>
            </div>

            <!-- Сітка місяців -->
            <div v-else-if="pickerView === 'months'" class="drf-cal__pick">
              <button
                v-for="m in monthItems"
                :key="m.value"
                type="button"
                class="drf-cal__pick-item"
                :class="{
                  'is-active': m.value === placeholder.month,
                  'is-now': m.value === NOW_MONTH && placeholder.year === NOW_YEAR,
                }"
                @click="pickMonth(m.value)"
              >
                {{ m.label }}
              </button>
            </div>

            <div v-else class="drf-cal__months">
              <RangeCalendarGrid
                v-for="month in grid"
                :key="month.value.toString()"
                class="drf-cal__grid"
              >
                <!-- Підпис КОНКРЕТНОЇ сітки: видно, де травень, а де червень.
                     <caption> — валідний перший нащадок <table> (reka рендерить
                     сітку таблицею), лягає над нею. -->
                <caption class="drf-cal__grid-title">{{ monthLabel(month.value) }}</caption>
                <RangeCalendarGridHead>
                  <RangeCalendarGridRow class="drf-cal__row drf-cal__row--head">
                    <RangeCalendarHeadCell
                      v-for="day in weekDays"
                      :key="day"
                      class="drf-cal__weekday"
                    >
                      {{ day }}
                    </RangeCalendarHeadCell>
                  </RangeCalendarGridRow>
                </RangeCalendarGridHead>

                <RangeCalendarGridBody>
                  <RangeCalendarGridRow
                    v-for="(weekDates, wi) in month.rows"
                    :key="`w-${wi}`"
                    class="drf-cal__row"
                  >
                    <RangeCalendarCell
                      v-for="weekDate in weekDates"
                      :key="weekDate.toString()"
                      :date="weekDate"
                      class="drf-cal__cell"
                    >
                      <RangeCalendarCellTrigger
                        :day="weekDate"
                        :month="month.value"
                        class="drf-cal__day"
                      />
                    </RangeCalendarCell>
                  </RangeCalendarGridRow>
                </RangeCalendarGridBody>
              </RangeCalendarGrid>
            </div>
          </RangeCalendarRoot>
        </div>

        <!-- Звіти точні лише в межах тижня — тому вибір тут кратний тижням. -->
        <p v-if="mode === 'week'" class="drf-note">
          {{ labels.periodWeeksOnly }}
        </p>

        <!-- Футер: нічого не летить назовні, поки не «Застосувати» -->
        <footer class="drf-foot">
          <button type="button" class="drf-foot__ghost" @click="clear">
            <X :size="14" /> {{ labels.clear }}
          </button>
          <div class="drf-foot__right">
            <button type="button" class="drf-foot__ghost" @click="isOpen = false">{{ labels.cancel }}</button>
            <button
              type="button"
              class="drf-foot__apply"
              :disabled="isApplyDisabled"
              :title="isApplyDisabled ? labels.periodPickBoth : undefined"
              @click="apply"
            >
              <Check :size="14" /> {{ labels.apply }}
            </button>
          </div>
        </footer>
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
    <!-- Поза тригером: кнопка в кнопці — невалідний HTML і клік відкрив би календар. -->
    <button
      v-if="isClearable && period"
      type="button"
      class="drf-clear"
      :title="labels.allDates"
      :aria-label="labels.periodRemove"
      @click="emit('update:period', null as TPeriod)"
    >
      <X :size="13" />
    </button>
  </span>
</template>

<style scoped lang="scss">
.drf {
  display: inline-flex;
  align-items: center;
  gap: 2px;

  &--block { display: flex; flex: 1; }
}

.drf-clear {
  display: inline-flex;
  padding: 4px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: $color-muted;
  cursor: pointer;

  &:hover { color: $color-text; background: $color-border; }
}

.drf-trigger {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 32px;
  padding: 0 10px;
  background: $color-page-bg;
  border: 1px solid $color-border;
  border-radius: 8px;
  color: $color-text;
  font-size: 13px;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;

  &:hover { border-color: rgba(0, 0, 0, 0.2); }

  &--open {
    border-color: $color-accent;
    box-shadow: 0 0 0 2px $color-accent-dim;
  }

  // Тягнеться на всю ширину рядка; лейбл забирає вільне місце, дата — ліворуч.
  &--block {
    flex: 1;
    justify-content: flex-start;

    .drf-trigger__label { flex: 1; text-align: left; }
  }

  svg { color: $color-muted; flex-shrink: 0; }
  &__label { font-variant-numeric: tabular-nums; white-space: nowrap; }
}

.drf-body {
  display: flex;
  align-items: stretch;

  @media (max-width: 640px) {
    flex-direction: column;
  }
}

.drf-presets {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 148px;
  padding: 8px;
  border-right: 1px solid $color-border;

  @media (max-width: 640px) {
    width: auto;
    border-right: none;
    border-bottom: 1px solid $color-border;
    flex-direction: row;
    flex-wrap: wrap;
  }

  &__sep {
    height: 1px;
    margin: 4px 6px;
    background: $color-border;

    @media (max-width: 640px) { display: none; }
  }

  &__item {
    width: 100%;
    padding: 6px 10px;
    border: 0;
    border-radius: 8px;
    background: none;
    text-align: left;
    font-size: 12px;
    color: $color-text;
    transition: background 0.12s ease;

    &:hover { background: $color-page-bg; }

    @media (max-width: 640px) { width: auto; }
  }
}

.drf-note {
  padding: 8px 12px;
  border-top: 1px solid $color-border;
  font-size: 12px;
  color: $color-muted;
  text-align: center;
}

.drf-cal {
  padding: 10px;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  // Заголовок-кнопка (місяць-рік / діапазон років). Клік → сітка вибору.
  &__title {
    flex: 1;
    height: 26px;
    padding: 0 10px;
    border: 0;
    border-radius: 8px;
    background: none;
    font-size: 12px;
    font-weight: 600;
    color: $color-text;
    text-transform: capitalize;
    transition: background 0.12s ease;

    &:hover { background: $color-page-bg; }
  }

  // Сітка вибору року/місяця (4×3).
  &__pick {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    padding: 10px 8px 6px;
  }

  &__pick-item {
    height: 34px;
    min-width: 60px;
    padding: 0 12px;
    border: 0;
    border-radius: 8px;
    background: none;
    font-size: 12px;
    color: $color-text;
    font-variant-numeric: tabular-nums;
    transition: background 0.12s ease, color 0.12s ease;

    &:hover { background: $color-accent-dim; }

    // Поточний реальний рік/місяць — тонке кільце.
    &.is-now { box-shadow: inset 0 0 0 1px $color-border; }

    // Обраний (плейсхолдер) — акцент.
    &.is-active {
      background: $color-selected;
      color: $color-on-selected;
      font-weight: 600;
    }
  }

  &__nav {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border: 1px solid $color-border;
    border-radius: 8px;
    background: $color-surface;
    color: $color-text;

    &:hover { border-color: rgba(0, 0, 0, 0.2); }
    &[data-disabled] { opacity: 0.4; pointer-events: none; }
  }

  &__months {
    display: flex;
    gap: 14px;

    @media (max-width: 640px) {
      flex-direction: column;
      gap: 10px;
    }
  }

  // Підпис конкретної сітки місяця ("Травень 2026").
  &__grid-title {
    caption-side: top;
    margin-bottom: 6px;
    font-size: 12px;
    font-weight: 600;
    color: $color-text;
    text-transform: capitalize;
    text-align: center;
  }

  &__row {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
  }

  &__weekday {
    padding-bottom: 5px;
    font-size: 10px;
    font-weight: 500;
    color: $color-muted;
    text-align: center;
    text-transform: capitalize;
  }

  &__cell { text-align: center; }

  // Клітинка-день. data-* атрибути ставить reka; на них весь вигляд станів.
  &__day {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 28px;
    border: 0;
    border-radius: 8px;
    background: none;
    font-size: 12px;
    color: $color-text;
    font-variant-numeric: tabular-nums;
    transition: background 0.1s ease, color 0.1s ease;

    &:hover { background: $color-accent-dim; }

    // Поза поточним місяцем — приглушено.
    &[data-outside-view] { color: $color-muted; opacity: 0.5; }

    // Сьогодні — тонке кільце.
    &[data-today] { box-shadow: inset 0 0 0 1px $color-border; }

    // Усередині діапазону — м'який фон, прямокутник (краї скруглить start/end).
    &[data-highlighted],
    &[data-selected] {
      background: $color-accent-dim;
      border-radius: 0;
    }

    // Кінці діапазону — акцент.
    &[data-selection-start],
    &[data-selection-end] {
      background: $color-selected;
      color: $color-on-selected;
    }
    &[data-selection-start] { border-radius: 8px 0 0 8px; }
    &[data-selection-end] { border-radius: 0 8px 8px 0; }

    &[data-disabled] { color: $color-muted; opacity: 0.35; pointer-events: none; }
  }
}

.drf-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 12px;
  border-top: 1px solid $color-border;

  &__right { display: flex; align-items: center; gap: 8px; }

  &__ghost {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    height: 30px;
    padding: 0 10px;
    border: 0;
    border-radius: 8px;
    background: none;
    font-size: 12px;
    color: $color-muted;
    transition: background 0.12s ease, color 0.12s ease;

    &:hover { background: $color-page-bg; color: $color-text; }
  }

  &__apply {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    height: 30px;
    padding: 0 14px;
    border: 0;
    border-radius: 8px;
    background: $color-selected;
    color: $color-on-selected;
    font-size: 12px;
    font-weight: 600;
    transition: opacity 0.12s ease;

    &:disabled { opacity: 0.45; }
  }
}
</style>

<!-- Не scoped: PopoverContent телепортується в body, і його КОРІНЬ не отримує
     scope-атрибут (reka форвардить/фрагмент), тому scoped-правило .drf-pop до
     нього не чіпляється. Внутрішні .drf-* scope мають — тому оформлені, а сам
     контейнер лишався прозорим. Заливку/тінь/z-index вішаємо тут. Клас
     достатньо специфічний, щоб не текти. -->
<style lang="scss">
.drf-pop {
  z-index: 1000;
  background: $color-surface;
  border: 1px solid $color-border;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.16);
  overflow: hidden;
}
</style>
