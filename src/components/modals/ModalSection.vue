<script setup lang="ts">
// Секція тіла модалки — базовий блок групування полів.
// Розділення сусідніх секцій — повітрям + волосінню, А НЕ заголовком:
// заголовок опційний і потрібен лише там, де сам додає сенс (напр. "Чеки" + лічильник).
//
//   <ModalSection title="Чеки">
//     <template #meta>3 / 10</template>
//     ...поля...
//   </ModalSection>
//   <ModalSection>  <!-- без заголовка: просто відбито волосінню -->
//     ...поля...
//   </ModalSection>

defineProps<{ title?: string }>()
</script>

<template>
  <section class="m-section">
    <header v-if="title || $slots.meta" class="m-section__head">
      <span v-if="title" class="m-section__title">{{ title }}</span>
      <span v-if="$slots.meta" class="m-section__meta"><slot name="meta" /></span>
    </header>
    <slot />
  </section>
</template>

<style scoped lang="scss">
.m-section {
  display: flex;
  flex-direction: column;
  gap: 10px;

  // Сусідні секції: волосінь + повітря. Працює саме між інстансами ModalSection,
  // тому окремих класів-роздільників у модалках писати не треба.
  & + & {
    padding-top: 16px;
    border-top: 1px solid $color-border;
  }

  &__head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
  }

  &__title {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: $color-muted;
  }

  &__meta {
    font-size: 11px;
    color: $color-muted;
    font-variant-numeric: tabular-nums;
  }
}
</style>
