<script setup lang="ts">
// Підтвердження дії — замість window.confirm: той — системний сірий діалог без
// стилю й без розрізнення небезпечної дії, і на ньому кнопка «OK» однакова для
// «Видалити назавжди» і «Зберегти». Тут — заголовок-питання, пояснення
// наслідків і кнопка зі словом дії; незворотне — червоним.
//
// Відкривати через useConfirm(), а не modals.show напряму: результат — boolean.

import ModalCard from './ModalCard.vue'
import { SharedConfig } from '../../config'
import { useCurrentModal } from '../../plugins/modals.plugin'
import UiButton from '../ui/UiButton.vue'

withDefaults(defineProps<{
  /** Питання: «Видалити платіж?» */
  title: string
  /** Наслідки, якщо вони неочевидні. Абзаци — через порожній рядок. */
  text?: string
  /** Слово дії на кнопці: «Видалити», «Зняти», «Підтвердити». */
  confirmText?: string
  /** Незворотна дія — червона кнопка. */
  isDanger?: boolean
}>(), {
  text: undefined,
  confirmText: () => SharedConfig.get().labels.yes,
  isDanger: false,
})

const { resolve } = useCurrentModal<boolean>()
// Enter підтверджує сам: фокус одразу на кнопці дії (autofocus). Окремий
// хоткей тут шкодив би — Enter на «Скасувати» тоді підтверджував би.

</script>

<template>
  <ModalCard :title="title" @close="resolve(false)">
    <p v-if="text" class="confirm__text">{{ text }}</p>

    <template #footer>
      <UiButton variant="ghost" @click="resolve(false)">{{ SharedConfig.get().labels.cancel }}</UiButton>
      <UiButton :variant="isDanger ? 'danger' : 'primary'" autofocus @click="resolve(true)">
        {{ confirmText }}
      </UiButton>
    </template>
  </ModalCard>
</template>

<style scoped lang="scss">
.confirm__text {
  margin: 0;
  max-width: 420px;
  font-size: 14px;
  line-height: 1.5;
  color: $color-text;
  // Абзаци з тексту питання — як є.
  white-space: pre-line;
}
</style>
