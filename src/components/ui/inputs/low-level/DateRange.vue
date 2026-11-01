<script setup lang="ts">
import {computed} from "vue";
import dayjs from "dayjs";
import {DateHelper} from "../../../../helpers/date.helper";
import { SharedConfig } from '../../../../config'

defineEmits<{
  (e: 'blur'): void
}>()

const start = defineModel<Date | undefined>('start', { required: true });
const end = defineModel<Date | undefined>('end', { required: true });

export interface DateRangeProps {
  startLabel?: string;
  endLabel?: string;
  isInclusive?: boolean;
}

const props = withDefaults(defineProps<DateRangeProps>(), {
  startLabel: () => SharedConfig.get().labels.dateFrom,
  endLabel: () => SharedConfig.get().labels.dateTo,
  isInclusive: false,
});

function formatDate(d: Date | undefined): string {
  if (!d) return '';
  return DateHelper.toJSONDate(d);
}

function parseDate(v: string): Date | undefined {
  if (!v) return undefined;
  return dayjs(v).toDate();
}

function toEndOfDay(d: Date): Date {
  return dayjs(d).endOf('day').toDate();
}

const startValue = computed({
  get: () => formatDate(start.value),
  set: (v) => { start.value = parseDate(v); }
});

const endValue = computed({
  get: () => formatDate(end.value),
  set: (v) => {
    const d = parseDate(v);
    if (d && props.isInclusive) {
      end.value = toEndOfDay(d);
    } else {
      end.value = d;
    }
  }
});
</script>

<template>
  <div class="input-group">
    <label class="input">
      <span class="input__hint">{{ startLabel }}</span>
      <input class="input__field"
             type="date"
             v-model="startValue"
             @blur="$emit('blur')"
      >
    </label>
    <label class="input">
      <span class="input__hint">{{ endLabel }}</span>
      <input class="input__field"
             type="date"
             v-model="endValue"
             @blur="$emit('blur')"
      >
    </label>
  </div>
</template>

<style scoped lang="scss">
.input-group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.input {
  display: flex;
  align-items: center;
  gap: 8px;

  padding: 4px 8px;
  min-height: 32px;

  background-color: $color-surface;
  border-radius: 6px;
  border: 1px solid $color-border-strong;

  transition: border-color .15s ease, box-shadow .15s ease;

  &:focus-within {
    border-color: $color-accent;
    box-shadow: 0 0 0 2px rgba($color-accent, .18);
  }

  &__hint {
    font-size: .85em;
    color: $color-muted;
    white-space: nowrap;
  }

  &__field {
    flex: 1;
    border: none;
    outline: none;
    background: transparent;
  }
}
</style>
