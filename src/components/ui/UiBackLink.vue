<script setup lang="ts">
// «Назад» у шапці картки: по історії, а якщо її немає (зайшли за прямим
// посиланням) — у список із `fallback`.

import { ArrowLeft } from '@lucide/vue'
import { SharedConfig } from '../../config'

withDefaults(defineProps<{
  fallback: string | object
  label?: string
}>(), {
  label: () => SharedConfig.get().labels.back,
})
</script>

<template>
  <button type="button" class="ui-back" @click="SharedConfig.get().goBack(fallback)">
    <ArrowLeft :size="14" />
    {{ label }}
  </button>
</template>

<style scoped lang="scss">
.ui-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  align-self: flex-start;
  // preflight знімає з button фон/рамку/падінги — повертаємо вигляд посилання.
  padding: 0;
  border: 0;
  background: none;
  font-size: 13px;
  color: $color-muted;
  transition: color 0.15s ease;

  &:hover { color: $color-accent-ink; }
}
</style>
