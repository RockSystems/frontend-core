<script setup lang="ts">
defineProps<{
  label: string
  fn: () => void
}>();
</script>

<template>
  <span @click="fn()" class="btn">
    {{ label }}
  </span>
</template>

<style scoped lang="scss">
.btn {
  cursor: pointer;
  color: $color-accent-ink;
  text-decoration: underline;
}
</style>
