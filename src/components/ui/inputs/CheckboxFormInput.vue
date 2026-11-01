<script setup lang="ts">
// Прапорець у формі (vee-validate) — CheckboxInput, привʼязаний до поля.
// FilterCheckbox — інше: чип рядка фільтрів, не поле форми.

import { Field } from 'vee-validate'
import CheckboxInput from './CheckboxInput.vue'

defineProps<{
  name: string
  label: string
  /** Через тире після підпису — коротка приписка, не другий рядок. */
  hint?: string | null
}>()
</script>

<template>
  <!-- unchecked-value: без нього знята галочка стає undefined, і z.boolean() мовчки
       блокує сабміт — прапорець помилок не показує. -->
  <Field
    v-slot="{ value, handleChange }"
    :name="name"
    type="checkbox"
    :value="true"
    :unchecked-value="false"
  >
    <CheckboxInput
      :model-value="value === true"
      :label="label"
      :hint="hint"
      @update:model-value="handleChange($event)"
    />
  </Field>
</template>
