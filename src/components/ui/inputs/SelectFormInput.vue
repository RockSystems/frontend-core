<script setup lang="ts" generic="TValue">
import SmartField from "./SmartField.vue";
import {SelectItem} from "../../../types/ui/select";

defineProps<{
  label: string,
  name: string,
  items: SelectItem<TValue>[],
  isRequired?: boolean
}>();
</script>

<template>
  <SmartField
      :name="name"
      :label="label"
      :is-required="isRequired"
      v-slot="{ field, handleChange }"
  >
    <select
        v-bind="field"
        @change="(e) => {
          const val = (e.target as HTMLSelectElement).value;
          handleChange(val === '' ? undefined : val);
        }"
    >
      <option value="" selected></option>
      <option v-for="item in items" :key="item.id" :value="item.value">
        {{ item.title }}
      </option>
    </select>
  </SmartField>
</template>

<style scoped lang="scss">

</style>
