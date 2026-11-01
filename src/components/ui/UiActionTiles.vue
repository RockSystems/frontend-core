<script setup lang="ts">
// Великі плашки-дії в модалці-лаунчері: іконка, назва, пояснення одним рядком.
// Одна розмітка на всі хаби (налаштування водія, дії з водієм на дашборді),
// щоб плашки не розходились відступами й ховером.

import type { UiActionTile } from './uiActionTiles.types'

defineProps<{ tiles: UiActionTile[] }>()
</script>

<template>
  <div class="ui-tiles">
    <button
      v-for="tile in tiles"
      :key="tile.title"
      type="button"
      class="ui-tiles__tile"
      @click="tile.action()"
    >
      <span class="ui-tiles__icon">
        <component :is="tile.icon" :size="20" />
      </span>
      <span class="ui-tiles__name">{{ tile.title }}</span>
      <span class="ui-tiles__desc">{{ tile.desc }}</span>
    </button>
  </div>
</template>

<style scoped lang="scss">
.ui-tiles {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;

  &__tile {
    flex: 1 1 calc(50% - 5px);
    min-width: 220px;

    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
    padding: 14px;

    text-align: left;
    background: $color-surface;
    border: 1px solid $color-border;
    border-radius: 10px;

    transition: border-color 140ms ease, background-color 140ms ease,
                transform 140ms ease, box-shadow 140ms ease;

    &:hover {
      border-color: $color-accent;
      background: $color-accent-dim;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(15, 20, 30, 0.06);

      .ui-tiles__icon {
        background: $color-selected;
        color: $color-on-selected;
      }
    }
  }

  &__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;

    border-radius: 9px;
    background: $color-accent-dim;
    color: $color-accent-ink;

    transition: background-color 140ms ease, color 140ms ease;
  }

  &__name {
    font-size: 14px;
    font-weight: 600;
    color: $color-text;
  }

  &__desc {
    font-size: 12px;
    line-height: 1.35;
    color: $color-muted;
  }
}
</style>
