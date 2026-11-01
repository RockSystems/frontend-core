<script setup lang="ts">
// Каркас модалки: шапка (title/subtitle/×) + body + footer.
// Использует глобальные .modal*-стили из BaseModal — чтобы при создании модалок
// не приходилось помнить имена классов:
//
//   <ModalCard form title="..." @close="close()" @submit="submit">
//     <template #subtitle>Водій: <b>{{ name }}</b></template>
//     ...поля...
//     <template #footer>
//       <UiButton variant="ghost" @click="close()">Скасувати</UiButton>
//       <UiButton type="submit" variant="primary" :is-loading="isSubmitting">Зберегти</UiButton>
//     </template>
//   </ModalCard>

import { X } from '@lucide/vue'
import { onMounted, useTemplateRef } from 'vue'
import UiIconButton from '../ui/UiIconButton.vue'
import { SharedConfig } from '../../config'

interface Props {
  title: string
  subtitle?: string
  // form=true → корень <form> + emit('submit') (submit-by-Enter работает).
  form?: boolean
  // footerSplit → danger-зона слева, основные кнопки справа (через ModalFooterRight).
  footerSplit?: boolean
}

defineProps<Props>()
const labels = SharedConfig.get().labels
const emit = defineEmits<{ close: []; submit: [] }>()

// Атрибут `autofocus` браузер виконує раз на сторінку, а модалка зʼявляється
// пізніше — тож фокус ставимо самі. Кадр чекаємо, щоб діалог не перехопив його.
const root = useTemplateRef<HTMLElement>('root')
onMounted(() => requestAnimationFrame(() => root.value?.querySelector<HTMLElement>('[autofocus]')?.focus()))
</script>

<template>
  <component
    :is="form ? 'form' : 'div'"
    ref="root"
    class="modal"
    @submit.prevent="emit('submit')"
  >
    <header class="modal__header">
      <div>
        <p class="modal__title">{{ title }}</p>
        <p v-if="subtitle || $slots.subtitle" class="modal__subtitle">
          <slot name="subtitle">{{ subtitle }}</slot>
        </p>
      </div>
      <UiIconButton variant="ghost" tone="muted" :aria-label="labels.close" @click="emit('close')">
        <X :size="16" />
      </UiIconButton>
    </header>

    <div class="modal__body">
      <slot />
    </div>

    <footer
      v-if="$slots.footer"
      class="modal__footer"
      :class="{ 'modal__footer--split': footerSplit }"
    >
      <slot name="footer" />
    </footer>
  </component>
</template>
