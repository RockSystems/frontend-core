<script setup lang="ts">
// Вибір календарного місяця — сітка років і місяців, а не дропдаун.
//
// Дропдаун зі списком «Липень 2026, Червень 2026, …» тут програвав по суті:
// місяць — це точка календаря, у нього є рік і дванадцять клітинок, і людина
// шукає його саме так. Списком же доводилось гортати десятки однакових рядків,
// а рік читався лише в кінці підпису.
//
// Доступні місяці задає той, хто кличе (`months`): у виплатах це проміжок від
// початку обліку до поточного місяця. Недоступні клітинки лишаються на місці
// вимкненими — так видно межі періоду, а не порожнечу без пояснення. Без
// `months` можна обрати будь-який місяць будь-якого року.

import { SharedConfig } from '../../config'
import { CalendarDays, ChevronLeft, ChevronRight, X } from '@lucide/vue'
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'
import { computed, ref, watch } from 'vue'
import { MonthHelper } from '../../helpers/month.helper'

const props = withDefaults(defineProps<{
  /** `YYYY-MM`; `null` — нічого не обрано. */
  modelValue: string | null
  /** Місяці, які можна обрати. Порядок неважливий — сітку будує сам компонент. Не задано — будь-які. */
  months?: ReadonlyArray<{ value: string; label: string }>
  /** Найпізніший доступний місяць `YYYY-MM` — коли межа лише зверху (не майбутнє). */
  max?: string
  placeholder?: string
  disabled?: boolean
  /** Чи можна повернутись до «нічого не обрано». */
  clearable?: boolean
}>(), {
  placeholder: () => SharedConfig.get().labels.monthPlaceholder,
  clearable: true,
})

const emit = defineEmits<{ 'update:modelValue': [value: string | null] }>()

const isOpen = ref(false)

const currentYear = new Date().getFullYear()

/** null — обмежень немає. */
const allowed = computed(() => props.months ? new Set(props.months.map(item => item.value)) : null)

const years = computed(() => {
  const list = [...new Set(
    (props.months ?? []).flatMap(item => MonthHelper.parse(item.value)?.year ?? []),
  )]

  return list.sort((a, b) => a - b)
})

const minYear = computed(() => props.months ? years.value[0] ?? currentYear : -Infinity)
const maxYear = computed(() => Math.min(
  props.months ? years.value[years.value.length - 1] ?? currentYear : Infinity,
  props.max ? MonthHelper.parse(props.max)?.year ?? Infinity : Infinity,
))

/**
 * Рік, з якого відкривається сітка без вибору: найновіший доступний (свіжий
 * місяць потрібен частіше за давній), а без обмежень — поточний.
 */
const defaultYear = computed(() => props.months || props.max ? maxYear.value : currentYear)

/** Рік, який показує сітка. Відкриваємо на році обраного місяця. */
const viewYear = ref(defaultYear.value)

watch(isOpen, (open) => {
  if (!open) return

  viewYear.value = (props.modelValue === null ? null : MonthHelper.parse(props.modelValue)?.year)
    ?? defaultYear.value
})

const cells = computed(() => MonthHelper.names().map((name, index) => {
  const value = MonthHelper.key(viewYear.value, index + 1)

  return {
    value,
    name,
    // `YYYY-MM` порівнюється рядком так само, як датою.
    isAvailable: (allowed.value === null || allowed.value.has(value)) && (!props.max || value <= props.max),
    isSelected: props.modelValue === value,
  }
}))

const triggerLabel = computed(() =>
  props.modelValue === null ? props.placeholder : MonthHelper.label(props.modelValue),
)

function shiftYear(step: 1 | -1): void {
  viewYear.value = Math.min(maxYear.value, Math.max(minYear.value, viewYear.value + step))
}

function pick(value: string): void {
  emit('update:modelValue', value)
  isOpen.value = false
}

// Скидання не закриває поповер: услід за «усі місяці» часто одразу обирають
// інший, і повторне відкриття було б зайвим кроком.
function clear(): void {
  emit('update:modelValue', null)
}
</script>

<template>
  <PopoverRoot v-model:open="isOpen">
    <PopoverTrigger
      class="mf-trigger"
      :class="{ 'mf-trigger--open': isOpen, 'mf-trigger--empty': modelValue === null }"
      :disabled="disabled || months?.length === 0"
    >
      <CalendarDays :size="14" />
      <span class="mf-trigger__label">{{ triggerLabel }}</span>

      <!-- Хрестик прямо в тригері: скидання — найчастіша дія після вибору, і
           заради неї відкривати поповер не варто. -->
      <span
        v-if="clearable && modelValue !== null"
        class="mf-trigger__clear"
        role="button"
        tabindex="-1"
        :title="SharedConfig.get().labels.allMonths"
        @click.stop="clear"
      >
        <X :size="13" />
      </span>
    </PopoverTrigger>

    <PopoverPortal>
      <PopoverContent align="start" :side-offset="6" class="mf-pop">
        <div class="mf-head">
          <button
            type="button"
            class="mf-head__nav"
            :disabled="viewYear <= minYear"
            @click="shiftYear(-1)"
          >
            <ChevronLeft :size="16" />
          </button>

          <span class="mf-head__year">{{ viewYear }}</span>

          <button
            type="button"
            class="mf-head__nav"
            :disabled="viewYear >= maxYear"
            @click="shiftYear(1)"
          >
            <ChevronRight :size="16" />
          </button>
        </div>

        <div class="mf-grid">
          <button
            v-for="cell in cells"
            :key="cell.value"
            type="button"
            class="mf-grid__cell"
            :class="{ 'mf-grid__cell--on': cell.isSelected }"
            :disabled="!cell.isAvailable"
            @click="pick(cell.value)"
          >
            {{ cell.name }}
          </button>
        </div>

        <button
          v-if="clearable && modelValue !== null"
          type="button"
          class="mf-reset"
          @click="clear"
        >
          {{ SharedConfig.get().labels.allMonths }}
        </button>
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>

<style scoped lang="scss">
.mf-trigger {
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
  &:disabled { opacity: 0.6; }

  &--open {
    border-color: $color-accent;
    box-shadow: 0 0 0 2px $color-accent-dim;
  }

  &--empty .mf-trigger__label { color: $color-muted; }

  svg { color: $color-muted; flex-shrink: 0; }

  &__label { white-space: nowrap; }

  &__clear {
    display: inline-flex;
    margin-right: -3px;
    border-radius: 4px;
    cursor: pointer;

    &:hover svg { color: $color-text; }
  }
}

.mf-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  border-bottom: 1px solid $color-border;

  &__year {
    font-size: 13px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  &__nav {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;

    border: 0;
    border-radius: 6px;
    background: none;
    color: $color-text;

    &:hover:not(:disabled) { background: $color-page-bg; }
    &:disabled { color: $color-border; }
  }
}

.mf-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
  padding: 8px;

  &__cell {
    padding: 7px 8px;

    border: 0;
    border-radius: 6px;
    background: none;
    color: $color-text;
    font-size: 12px;

    &:hover:not(:disabled) { background: $color-page-bg; }

    // Недоступний місяць лишається на місці: так видно межі обліку. Прибрати
    // його зовсім — і сітка стрибала б від року до року.
    &:disabled { color: $color-border; }

    &--on {
      background: $color-selected;
      color: $color-on-selected;

      &:hover:not(:disabled) { background: $color-accent-ink; }
    }
  }
}

.mf-reset {
  width: 100%;
  padding: 7px 10px;

  border: 0;
  border-top: 1px solid $color-border;
  background: none;
  color: $color-muted;
  font-size: 12px;

  &:hover { color: $color-text; background: $color-page-bg; }
}
</style>

<!-- Корінь телепортованого PopoverContent scope-атрибута не отримує, тому
     заливка/тінь/z-index — у нескоупленому блоці (як у DateRangeField). -->
<style lang="scss">
.mf-pop {
  z-index: 1000;
  width: 260px;

  background: $color-surface;
  border: 1px solid $color-border;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.16);
  overflow: hidden;
}
</style>
