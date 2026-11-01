<script setup lang="ts">

defineProps<{
  text: string,
  subText?: string
}>()
</script>

<template>
  <div class="simple-cell">
    <span class="simple-cell__primary">
      {{ text }}
    </span>
    <span v-if="subText" class="simple-cell__secondary">
      {{ subText }}
    </span>
  </div>
</template>

<style scoped lang="scss">

.simple-cell {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;

  & > * {
    max-inline-size: 100%;
  }

  &__primary {
    font-weight: 500;
  }

  &__secondary {
    font-size: .9em;
    color: $color-muted;
  }
}
</style>
