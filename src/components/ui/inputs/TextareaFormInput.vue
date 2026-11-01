<script setup lang="ts">
// Багаторядкове поле форми (vee-validate): коментар, причина, нотатка.
// Сирий <textarea> у SmartField стояв копією по формах; тут — одним рядком, і
// стилі текстових полів живуть в одному місці.
//
// Решта атрибутів (autofocus, maxlength) іде прямо на <textarea>.

import SmartField from './SmartField.vue'

defineOptions({ inheritAttrs: false })

withDefaults(defineProps<{
  name: string
  label: string
  placeholder?: string
  rows?: number
  hint?: string
  isRequired?: boolean
}>(), {
  placeholder: undefined,
  rows: 2,
  hint: undefined,
  isRequired: false,
})
</script>

<template>
  <SmartField v-slot="{ field, inputId }" :name="name" :label="label" :hint="hint" :is-required="isRequired">
    <textarea :id="inputId" v-bind="{ ...field, ...$attrs }" :rows="rows" :placeholder="placeholder" />
  </SmartField>
</template>
