<script setup lang="ts">
// Ряд KPI-плашок над таблицею. Що показувати — вирішує фіча (своя computed
// cards), кіт відповідає лише за вигляд і скелетон.

import type { UiKpiCardItem } from './uiKpi.types'

withDefaults(defineProps<{
  cards: UiKpiCardItem[]
  /** lg — коли карток 3–4 і є місце на великі цифри; md — коли їх багато. */
  size?: 'md' | 'lg'
}>(), { size: 'md' })
</script>

<template>
  <section class="ui-kpi" :class="`ui-kpi--${size}`">
    <article v-for="card in cards" :key="card.key" class="ui-kpi__card">
      <div class="ui-kpi__icon" :class="card.tone && `ui-kpi__icon--${card.tone}`">
        <component :is="card.icon" :size="18" />
      </div>
      <div class="ui-kpi__body">
        <span v-if="card.value === null" class="ui-kpi__skeleton" />
        <div v-else class="ui-kpi__value" :class="card.tone && `ui-kpi__value--${card.tone}`">
          {{ card.value }}
        </div>
        <div class="ui-kpi__label" :title="card.labelHint">
          {{ card.label }}
          <!-- Приписка — у рядку підпису, не біля числа: там вона з'їдала місце
               суми, і замість частки лишалось «…». -->
          <!-- Крапка з припискою одним шматком: при переносі вона не лишається
               в кінці рядка без значення. -->
          <span v-if="card.note" class="ui-kpi__note-group">·&nbsp;<span class="ui-kpi__note">{{ card.note }}</span></span>
          <!-- Для позначок біля підпису (напр. «комісія попередня»). -->
          <slot name="suffix" :card="card" />
        </div>
      </div>
    </article>
  </section>
</template>

<style scoped lang="scss">
.ui-kpi {
  display: grid;
  // auto-fit + minmax = рівно стільки колонок, скільки влазить. Медіазапити
  // під кожну кількість карток не потрібні. 200px — щоб «100 000 000,00 ₴»
  // вміщалась повним шрифтом.
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 8px;

  &__card {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    background: $color-surface;
    border: 1px solid $color-border;
    border-radius: 10px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
  }

  &__icon {
    width: 32px;
    height: 32px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    background: $color-accent-dim;
    color: $color-accent-ink;
    flex-shrink: 0;

    &--positive { background: rgba($color-green, 0.12); color: $color-green-ink; }
    &--negative { background: rgba($color-danger, 0.12); color: $color-danger; }
    &--muted    { background: $color-page-bg; color: $color-muted; }
  }

  &__body {
    // Довгий підпис переноситься, а числа сусідніх карток лишаються в одну лінію.
    align-self: flex-start;
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
    min-width: 0;
    // Шрифт числа рахується від ширини картки (cqi), а не від самого числа.
    container-type: inline-size;
  }

  &__value {
    // Велика сума у вузькій картці не обрізається, а дрібнішає: при 11.5cqi
    // «999 999 999,99 ₴» якраз займає всю ширину. Ширша картка — звичайні 16px.
    font-size: min(16px, 11.5cqi);
    font-weight: 700;
    color: $color-text;
    line-height: 1.15;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    &--positive { color: $color-green-ink; }
    &--negative { color: $color-danger; }
    &--muted    { color: $color-muted; }
  }

  // Приписка (частка) у рядку підпису: кольором тексту, щоб читалась як
  // значення, а не як продовження підпису.
  &__note {
    font-weight: 600;
    color: $color-text;
  }

  &__note-group {
    white-space: nowrap;
  }

  // Довгий підпис з припискою переноситься цілими шматками, а не обрізається.
  &__label {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0 4px;
    font-size: 11px;
    color: $color-muted;
  }

  &__skeleton {
    width: 70px;
    height: 16px;
    border-radius: 4px;
    background: linear-gradient(90deg, $color-border 0%, $color-page-bg 50%, $color-border 100%);
    background-size: 200% 100%;
    animation: ui-kpi-shimmer 1.4s linear infinite;
  }

  &--lg {
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 12px;

    .ui-kpi__card { gap: 12px; padding: 14px 16px; border-radius: 12px; }
    .ui-kpi__icon { width: 36px; height: 36px; border-radius: 10px; }
    .ui-kpi__body { gap: 4px; }
    .ui-kpi__value { font-size: min(22px, 11.5cqi); line-height: 1.1; }
    .ui-kpi__label { font-size: 12px; }
    .ui-kpi__skeleton { width: 72px; height: 22px; border-radius: 6px; }
  }
}

@keyframes ui-kpi-shimmer {
  from { background-position: 200% 0; }
  to { background-position: -200% 0; }
}

@media (prefers-reduced-motion: reduce) {
  .ui-kpi__skeleton { animation: none; }
}
</style>
