<script setup lang="ts">
// Тонка смуга вгорі сторінки, поки в польоті є хоч один запит vue-query
// (і читання, і мутації). Один індикатор на застосунок — вішається в AppLayout.
//
// Показ із затримкою: більшість запитів вертаються за 100–200 мс, і без неї
// смуга блимала б на кожному кліку фільтра. Ховається одразу, без затримки.

import { SharedConfig } from '../config'
import { useIsFetching, useIsMutating } from '@tanstack/vue-query'
import { computed, onBeforeUnmount, ref, watch } from 'vue'

const SHOW_DELAY_MS = 300

const fetchingCount = useIsFetching()
const mutatingCount = useIsMutating()

const isPending = computed(() => fetchingCount.value + mutatingCount.value > 0)
const isVisible = ref(false)

let showTimer: ReturnType<typeof setTimeout> | null = null

function clearShowTimer(): void {
  if (showTimer === null) return
  clearTimeout(showTimer)
  showTimer = null
}

watch(isPending, (pending) => {
  clearShowTimer()

  if (!pending) {
    isVisible.value = false
    return
  }

  showTimer = setTimeout(() => { isVisible.value = true }, SHOW_DELAY_MS)
}, { immediate: true })

onBeforeUnmount(clearShowTimer)
</script>

<template>
  <Transition name="pending-bar">
    <div v-if="isVisible" class="pending-bar" role="progressbar" :aria-label="SharedConfig.get().labels.loading" />
  </Transition>
</template>

<style scoped lang="scss">
.pending-bar {
  position: fixed;
  z-index: 10000;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  overflow: hidden;
  background: $color-accent-dim;

  // Тривалість запиту наперед невідома, тому смуга невизначена: бігунок
  // ходить по доріжці, а не заповнює її відсотками.
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    width: 40%;
    background: $color-accent;
    animation: pending-bar-slide 1.1s ease-in-out infinite;
  }
}

@keyframes pending-bar-slide {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(350%); }
}

.pending-bar-enter-active,
.pending-bar-leave-active {
  transition: opacity 0.2s ease;
}

.pending-bar-enter-from,
.pending-bar-leave-to {
  opacity: 0;
}
</style>
