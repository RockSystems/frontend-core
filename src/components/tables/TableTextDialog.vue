<script setup lang="ts">
// Повний вміст обрізаної комірки таблиці: довгий текст чи всі плашки. Лише читати —
// прокрутити, виділити, скопіювати. Закривають хрестиком чи Esc, як інші модалки.

import { useEventListener } from '@vueuse/core'
import { nextTick, useTemplateRef, watch } from 'vue'
import ModalCard from '../modals/ModalCard.vue'
import { TableTextState } from './tableText'

const view = TableTextState.current
const nodeHost = useTemplateRef<HTMLElement>('nodeHost')

// Плашки — копією вмісту комірки: ті самі класи, тож і той самий вигляд. У копії
// всі плашки видно, а «ще N» не потрібне — знімаємо це з самої копії, бо стилі
// схованої плашки сильніші за будь-яке правило вікна.
watch(view, async (current) => {
  await nextTick()
  if (!current?.node || !nodeHost.value) return
  const copy = current.node.cloneNode(true) as Element
  for (const item of copy.querySelectorAll('.t-chips__item--hidden')) item.classList.remove('t-chips__item--hidden')
  for (const more of copy.querySelectorAll('.t-chips__more')) more.remove()
  nodeHost.value.replaceChildren(copy)
})

// Раніше за модалки (capture) і з preventDefault: таблиця буває й у модалці, і Esc
// має закрити лише це вікно — BaseModal пропускає вже оброблений Esc.
useEventListener(window, 'keydown', (event: KeyboardEvent) => {
  if (event.key !== 'Escape' || !view.value) return
  event.preventDefault()
  TableTextState.close()
}, { capture: true })
</script>

<template>
  <Transition name="modal-fade">
    <div v-if="view" class="modal-block">
      <ModalCard class="table-text" :title="view.title" @close="TableTextState.close()">
        <p v-if="view.text !== undefined" class="table-text__text">{{ view.text }}</p>
        <div v-else ref="nodeHost" class="table-text__node" />
      </ModalCard>
    </div>
  </Transition>
</template>

<style lang="scss">
.table-text {
  max-width: 640px;
}

.table-text__text {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
</style>
