<script setup lang="ts">
// «Глазик» для поля пароля: показывает/прячет введённое. Обёртка, а не своё поле:
// внутрь кладут любой инпут проекта — сырой <input> в SmartField или Input
// стартового кита — и отдают ему тип из слота:
//
//   <PasswordReveal v-slot="{ type }">
//     <input :type="type" autocomplete="current-password" v-bind="field" />
//   </PasswordReveal>
//
// Тексты кнопки — из SharedConfig: ядро языка не знает.

import { Eye, EyeOff } from '@lucide/vue'
import { computed, ref } from 'vue'
import { SharedConfig } from '../../../config'

const labels = SharedConfig.get().labels
const isVisible = ref(false)
const type = computed(() => (isVisible.value ? 'text' : 'password'))
</script>

<template>
  <span class="password-reveal">
    <slot :type="type" />
    <!-- mousedown.prevent — фокус остаётся в поле, курсор не прыгает. -->
    <button
      type="button"
      class="password-reveal__toggle"
      :aria-label="isVisible ? labels.hidePassword : labels.showPassword"
      :title="isVisible ? labels.hidePassword : labels.showPassword"
      :aria-pressed="isVisible"
      @mousedown.prevent
      @click="isVisible = !isVisible"
    >
      <EyeOff v-if="isVisible" :size="16" />
      <Eye v-else :size="16" />
    </button>
  </span>
</template>

<style lang="scss">
.password-reveal {
  position: relative;
  display: block;

  // Текст не уходит под кнопку. Селектор сильнее класса утилиты (px-3).
  > input {
    width: 100%;
    padding-right: 36px;
  }

  &__toggle {
    position: absolute;
    top: 50%;
    right: 4px;
    transform: translateY(-50%);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    border: 0;
    border-radius: 6px;
    background: none;
    color: $color-muted;
    cursor: pointer;

    &:hover { color: $color-text; }

    &:focus-visible {
      outline: 2px solid $color-accent;
      outline-offset: 1px;
    }
  }
}
</style>
