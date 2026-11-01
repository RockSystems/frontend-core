<script setup lang="ts" generic="T extends string | number">
// Сегментний перемикач: взаємовиключні варіанти в одній капсулі (7/30/90 днів,
// статус перевірки).
//
// Не плутати з вкладками (DriverActivity): там підкреслення й лічильники —
// інший елемент, а не варіант цього.
//
// Семантика — radiogroup: варіант рівно один, стрілки переходять між ними.
// `aria-pressed` на кнопках читався б як набір незалежних перемикачів.

import { type Component, computed, ref } from 'vue'
import type { UiBadgeTone } from './uiBadge.types'

interface Option {
  value: T
  label: string
  /**
   * Колір ОБРАНОГО варіанта — той самий тон, що в бейджа цього значення. Коли
   * варіант — це статус, вибір має виглядати так само, як статус у таблиці.
   * Без тону — нейтральна біла плашка (фільтри, періоди).
   */
  tone?: UiBadgeTone
  /** Значок біля підпису: вибір не тримається на одному кольорі. */
  icon?: Component
}

const props = defineProps<{
  modelValue: T
  options: ReadonlyArray<Option>
  // Для скрінрідера: група без назви читається як розсип кнопок.
  ariaLabel?: string
}>()

const emit = defineEmits<{ 'update:modelValue': [value: T] }>()

const buttons = ref<HTMLButtonElement[]>([])

// Значення поза списком = «ще не обрано» (перше призначення джерела водія).
// Тоді в табі мусить лишитися хоч один вхід у групу, інакше tabindex="-1" на
// всіх робить її недосяжною з клавіатури.
const hasSelection = computed(() => props.options.some(opt => opt.value === props.modelValue))

// Стрілки — як у нативної групи радіокнопок: переходять І обирають. Фокус
// ходить слідом, інакше обране й сфокусоване розійдуться.
function onKeydown(event: KeyboardEvent): void {
  const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key]
  const edge = { Home: 0, End: props.options.length - 1 }[event.key]
  if (step === undefined && edge === undefined) return

  event.preventDefault()

  const current = props.options.findIndex(opt => opt.value === props.modelValue)
  const count = props.options.length
  const next = edge ?? (current + step! + count) % count

  emit('update:modelValue', props.options[next].value)
  buttons.value[next]?.focus()
}
</script>

<template>
  <div class="ui-seg" role="radiogroup" :aria-label="ariaLabel" @keydown="onKeydown">
    <button
      v-for="(opt, index) in options"
      :key="opt.value"
      ref="buttons"
      type="button"
      role="radio"
      class="ui-seg__item"
      :class="{
        'ui-seg__item--active': modelValue === opt.value,
        [`ui-seg__item--${opt.tone}`]: modelValue === opt.value && opt.tone,
      }"
      :aria-checked="modelValue === opt.value"
      :tabindex="modelValue === opt.value || (!hasSelection && index === 0) ? 0 : -1"
      @click="emit('update:modelValue', opt.value)"
    >
      <component :is="opt.icon" v-if="opt.icon" :size="14" class="ui-seg__icon" />
      {{ opt.label }}
    </button>
  </div>
</template>

<style scoped lang="scss">
.ui-seg {
  display: inline-flex;
  gap: 2px;
  padding: 2px;
  background: $color-page-bg;
  border: 1px solid $color-border;
  border-radius: 8px;

  &__item {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 12px;
    border: none;
    border-radius: 6px;
    background: transparent;
    font-size: 12px;
    color: $color-muted;
    white-space: nowrap;
    transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;

    &:hover { color: $color-text; }

    &:focus-visible {
      outline: 2px solid $color-accent;
      outline-offset: 1px;
    }

    // Нейтральний активний — біла плашка з тінню: колір тут уже зайнятий
    // рештою інтерфейсу (фільтри, періоди).
    &--active {
      background: $color-surface;
      color: $color-text;
      font-weight: 600;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
    }

    // Тоновані — як бейдж того ж значення, плюс обвідка чорнилом. Обвідка
    // обовʼязкова: мʼяка підкладка нейтрального тону майже зливається з доріжкою,
    // і без неї обраний «нейтральний» варіант знову не відрізнити від решти.
    @each $tone, $soft, $ink in (
      neutral $color-neutral-soft $color-neutral-ink,
      success $color-green-soft $color-green-ink,
      danger $color-danger-soft $color-danger-ink,
      warning $color-warning-soft $color-warning-ink,
      info $color-accent-dim $color-accent,
      done $color-teal-soft $color-teal-ink
    ) {
      &--#{$tone} {
        background: $soft;
        color: $ink;
        box-shadow: inset 0 0 0 1px rgba($ink, 0.35);

        &:hover { color: $ink; }
      }
    }
  }

  &__icon { flex-shrink: 0; }
}
</style>
