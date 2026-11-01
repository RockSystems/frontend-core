<script setup lang="ts">
// Кнопка застосунку: форми, модалки, фільтри, тулбари.
//
// href або to → посилання (компонент дає проєкт: SharedConfig.link), але на вигляд та сама кнопка: «Скасувати» поруч зі
// «Зберегти» не має відрізнятись лише тому, що одне з них навігація.

import { Loader2 } from '@lucide/vue'
import { computed } from 'vue'
import { SharedConfig } from '../../config'

const props = withDefaults(defineProps<{
  // secondary — дефолт (звичайна дія); primary — головна в блоці;
  // ghost — відмова/закриття; danger — руйнівна (видалити).
  // Свій варіант проєкту (`ui-btn--violet`) — рядком, стилі глобально в проєкті.
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | (string & {})
  // xs — дії всередині рядка таблиці, де кнопка не має розпирати рядок.
  size?: 'xs' | 'sm' | 'md'
  href?: string
  to?: string | object
  type?: 'button' | 'submit'
  disabled?: boolean
  // Спінер + блокування: щоб не надіслати запит двічі.
  isLoading?: boolean
}>(), {
  variant: 'secondary',
  size: 'md',
  type: 'button',
})

const isDisabled = computed(() => props.disabled || props.isLoading)

const target = computed(() => props.to ?? props.href)
const link = SharedConfig.get().link
</script>

<template>
  <!-- Один корінь (а не v-if/v-else двома тегами): інакше це фрагмент, і
       class/@click, навішані ззовні, не потрапляють на елемент. -->
  <component
    :is="target ? link.component : 'button'"
    v-bind="target ? { [link.prop]: target } : { type, disabled: isDisabled }"
    class="ui-btn"
    :class="[`ui-btn--${variant}`, `ui-btn--${size}`]"
  >
    <Loader2 v-if="isLoading" :size="15" class="ui-btn__spinner" />
    <slot />
  </component>
</template>

<style scoped lang="scss">
@use 'sass:color';

.ui-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid $color-border;
  border-radius: $radius;
  background: $color-surface;
  color: $color-text;
  font-size: 13px;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
  text-decoration: none;
  cursor: pointer;
  transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease, opacity 120ms ease;

  // 36px — нижче межі 44px для пальця, тож на тач-екранах розширюємо саму
  // кнопку, а не тільки її вигляд.
  &--md { height: 36px; padding: 0 16px; }
  &--sm { height: 32px; padding: 0 12px; font-size: 12px; }
  &--xs { height: 24px; padding: 0 10px; font-size: 12px; font-weight: 400; gap: 4px; }

  @media (hover: none) {
    &--md { height: 44px; }
    &--sm { height: 40px; }
    &--xs { height: 32px; }
  }

  &--secondary:hover:not(:disabled) {
    background: $color-page-bg;
    border-color: color.adjust($color-border, $lightness: -6%);
  }

  // Вигляд головної кнопки — бренд проєкту: міксин `buttonPrimary` у контракті.
  &--primary { @include buttonPrimary; }

  // Ghost — вторинна (Скасувати / Закрити): прозоріша за дефолт.
  &--ghost {
    border-color: transparent;
    background: transparent;
    color: $color-muted;

    &:hover:not(:disabled) { background: $color-page-bg; color: $color-text; }
  }

  // Danger — руйнівна дія. Мʼякий червоний, а не заливка: кнопка «Видалити»
  // стоїть у футері поруч зі «Скасувати» і не має перетягувати увагу.
  &--danger {
    background: rgba($color-danger, 0.06);
    border-color: rgba($color-danger, 0.25);
    color: $color-danger;

    &:hover:not(:disabled) {
      background: rgba($color-danger, 0.12);
      border-color: rgba($color-danger, 0.4);
    }
  }

  &:disabled { opacity: 0.55; cursor: not-allowed; }

  &__spinner { animation: ui-btn-spin 0.9s linear infinite; }
}

@keyframes ui-btn-spin {
  to { transform: rotate(360deg); }
}

// Спінер — єдина анімація тут, і вона несе сенс («йде запит»). Але для тих,
// хто просив прибрати рух, лишаємо статичну іконку.
@media (prefers-reduced-motion: reduce) {
  .ui-btn__spinner { animation: none; }
}
</style>
