<script setup lang="ts">
// Повний вміст обрізаної комірки таблиці: довгий текст чи всі плашки. Лише читати —
// прокрутити, виділити, скопіювати. Закривають хрестиком чи Esc, як інші модалки.

import { useEventListener } from '@vueuse/core'
import { nextTick, useTemplateRef, watch } from 'vue'
import ModalCard from '../modals/ModalCard.vue'
import { TableTextState } from './tableText'

const view = TableTextState.current
const nodeHost = useTemplateRef<HTMLElement>('nodeHost')

// Плашки — копією вмісту комірки: ті самі класи, тож і той самий вигляд.
watch(view, async (current) => {
  await nextTick()
  if (current?.node && nodeHost.value) nodeHost.value.replaceChildren(current.node.cloneNode(true))
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

// Копія плашок — без обмеження в три рядки й без «ще N».
.table-text__node {
  .t-chips {
    max-height: none;
  }

  .t-chips__item--hidden {
    display: revert;
  }

  .t-chips__more {
    display: none;
  }
}
</style>
