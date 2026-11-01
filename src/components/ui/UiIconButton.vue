<script setup lang="ts">
// Іконкова кнопка 28×28: дії в рядку таблиці, розкриття рядка, закриття модалки.
//
// Тут, а не в shared: ні домену, ні тексту — сама геометрія та стани. Нею
// користуються самі _shared-компоненти (пагінатор, рядок таблиці, модалка), а
// вони не можуть тягнути нічого з shared.

withDefaults(defineProps<{
  // outlined — окрема кнопка на площині (дії в рядку, стрілки пагінатора);
  // ghost — кнопка всередині чужого елемента, де рамка додала б другу межу
  // поверх наявної (шеврон у комірці, хрестик у шапці модалки).
  variant?: 'outlined' | 'ghost'
  // Колір ховера (а у filled — заливки). neutral = звичайна дія, підсвічується
  // акцентом; muted = тиха службова дія (закрити), сіріє замість акценту.
  tone?: 'neutral' | 'muted' | 'primary' | 'success' | 'danger'
  // Залита — для головної дії в групі (Зберегти). Решта лишаються тихими,
  // інакше сім однакових яскравих кнопок у рядку не дають зачепитись оком.
  isFilled?: boolean
  disabled?: boolean
  type?: 'button' | 'submit'
}>(), {
  variant: 'outlined',
  tone: 'neutral',
  type: 'button',
})
</script>

<template>
  <button
    :type="type"
    :disabled="disabled"
    class="ui-icon-btn"
    :class="[
      `ui-icon-btn--${variant}`,
      `ui-icon-btn--${tone}`,
      { 'ui-icon-btn--filled': isFilled },
    ]"
  >
    <slot />
  </button>
</template>

<style scoped lang="scss">
.ui-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: $radius;
  line-height: 1;
  transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease;

  &:disabled { opacity: 0.5; cursor: not-allowed; }

  &--outlined {
    border: 1px solid $color-border;
    background: $color-surface;
    color: $color-text;
  }

  &--ghost {
    border: none;
    background: transparent;
    color: $color-muted;
  }

  &--neutral:hover:not(:disabled),
  &--primary:hover:not(:disabled) {
    background: $color-accent-dim;
    border-color: $color-accent;
    color: $color-accent-ink;
  }

  &--muted:hover:not(:disabled) {
    background: $color-page-bg;
    color: $color-text;
  }

  &--success:hover:not(:disabled) {
    background: $color-green-soft;
    border-color: $color-green-ink;
    color: $color-green-ink;
  }

  &--danger:hover:not(:disabled) {
    background: $color-danger-soft;
    border-color: $color-danger-ink;
    color: $color-danger-ink;
  }

  &--filled {
    color: #fff;

    &.ui-icon-btn--neutral,
    &.ui-icon-btn--primary { background: $color-accent; border-color: $color-accent; }
    &.ui-icon-btn--success { background: $color-green-ink; border-color: $color-green-ink; }
    &.ui-icon-btn--danger { background: $color-danger; border-color: $color-danger; }

    &:hover:not(:disabled) { opacity: 0.88; color: #fff; }
  }
}
</style>
