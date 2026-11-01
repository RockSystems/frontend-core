<script setup lang="ts">
// Картка-секція: рамка, заголовок з іконкою й лічильником, місце під дію
// праворуч і порожній стан.
//
// Та сама розмітка з тими самими 25 рядками SCSS була скопійована в пʼяти
// картках картки водія — зміна відступу вимагала обходу всіх пʼяти, і вони
// вже почали розходитись (десь був icon у заголовку, десь ні).

import type { Component } from 'vue'
import UiCount from './UiCount.vue'

withDefaults(defineProps<{
  title: string
  icon?: Component
  /** Лічильник біля заголовка. 0 не малюємо — «нуль» каже порожній стан. */
  count?: number
  isEmpty?: boolean
  emptyText?: string
  /** Прибрати падінги вмісту — коли всередині своя сітка на всю ширину. */
  isFlush?: boolean
}>(), { isEmpty: false, isFlush: false })
</script>

<template>
  <section class="ui-card">
    <h2 class="ui-card__title">
      <component :is="icon" v-if="icon" :size="15" />
      {{ title }}
      <UiCount v-if="count" :value="count" />

      <span class="ui-card__action"><slot name="action" /></span>
    </h2>

    <p v-if="isEmpty" class="ui-card__empty">{{ emptyText }}</p>
    <div v-else class="ui-card__body" :class="{ 'ui-card__body--flush': isFlush }">
      <slot />
    </div>
  </section>
</template>

<style scoped lang="scss">
.ui-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: $color-surface;
  border: 1px solid $color-border;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);

  &__title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: $color-muted;
  }

  // Дія притиснута до правого краю заголовка. Порожній span нічого не займає,
  // тому окремий v-if не потрібен.
  &__action {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-left: auto;
  }

  &__body {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;

    &--flush { gap: 0; }
  }

  &__empty {
    margin: 0;
    padding: 4px 0;
    font-size: 13px;
    color: $color-muted;
  }
}
</style>
