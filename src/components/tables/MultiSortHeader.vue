<script setup lang="ts">
// Шапка колонки, у якій кілька чисел — і стільки ж сортувань. Назва зверху,
// під нею дрібні кнопки-підписи («зібрано / внесено / борг», «сума / частка»).
//
// Розбивати таку колонку на кілька не варіант: заголовки з'їли б пів таблиці, а
// числа розійшлись би по екрану, хоча читають їх разом. Тому видимій колонці
// ставимо enableSorting: false (інакше клік по будь-якому місцю th перебивав би
// вибір конкретної кнопки), а за кожну кнопку відповідає власний ПРИХОВАНИЙ
// стовпець.
//
// Стан тримає TanStack, а не шапка. Поки вона рахувала його сама, на сторінці з
// мультисортуванням її номер пріоритету жив за своїми правилами й розходився з
// номерами звичайних колонок.

import type { Table } from '@tanstack/vue-table'
import { computed } from 'vue'
import type { MultiSortPart } from './multiSortHeader.types'

const props = defineProps<{
  label: string
  /**
   * Рядок таблиці шапці неважливий — вона чіпає лише `getColumn` і `getState`,
   * тож `any` тут нічого не втрачає. Параметризувати не можна: `Table<T>`
   * інваріантна за T, а кличуть шапку з `h(MultiSortHeader, { table })`, де
   * вивести T нізвідки — і `Table<DriverStatRow>` не сходився з `Table<unknown>`.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  table: Table<any>
  parts: ReadonlyArray<MultiSortPart>
  /** Клік додає ключ у стек, а не замінює його. Він же вмикає номери. */
  isMultiSort?: boolean
}>()

const items = computed(() => props.parts.map(part => ({
  ...part,
  column: props.table.getColumn(part.id),
})))

// Номер показуємо лише коли ключів справді кілька — інакше «1» біля єдиного
// сортування нічого не додає.
const isPrioShown = computed(() => props.table.getState().sorting.length > 1)
</script>

<template>
  <!-- t__th-stack — спільний каркас дворядкової шапки: inline-block, тож обидва
       рядки підхоплюють вирівнювання комірки (meta.align: right). -->
  <span class="t__th-stack multi-sort-th">
    <span>{{ label }}</span>

    <span class="multi-sort-th__parts">
      <template v-for="(item, i) in items" :key="item.id">
        <span v-if="i" class="multi-sort-th__sep">/</span>

        <!-- stop: у th висить обробник сортування колонки. Зараз він вимкнений,
             але без stop кнопка почне сортувати «не тим», щойно його ввімкнуть. -->
        <button
          v-if="item.column"
          type="button"
          class="multi-sort-th__btn"
          :class="{ 'multi-sort-th__btn--on': !!item.column.getIsSorted() }"
          :title="item.hint"
          @click.stop="item.column.toggleSorting(undefined, isMultiSort)"
        >
          {{ item.label }}
          <span v-if="item.column.getIsSorted()">
            {{ item.column.getIsSorted() === 'asc' ? '↑' : '↓' }}
          </span>
          <sup
            v-if="item.column.getIsSorted() && isPrioShown"
            class="multi-sort-th__prio"
          >{{ item.column.getSortIndex() + 1 }}</sup>
        </button>
      </template>
    </span>
  </span>
</template>

<style scoped lang="scss">
.multi-sort-th {
  &__parts {
    display: block;
    margin-top: 1px;
    // Дрібніше за назву: це підпис до неї, а не другий заголовок.
    font-size: 10px;
    font-weight: 400;
    text-transform: none;
    letter-spacing: 0;
  }

  &__sep {
    // Роздільник не клікабельний, тому й тихіший за самі підписи.
    margin: 0 2px;
    opacity: 0.4;
  }

  &__btn {
    padding: 0;
    border: none;
    background: none;
    font: inherit;
    color: inherit;
    // Неактивні підписи приглушені — активний виділяється сам, без заливки.
    opacity: 0.7;

    &:hover { opacity: 1; }

    &:focus-visible {
      outline: 1px solid $color-accent;
      outline-offset: 2px;
      border-radius: 3px;
    }

    &--on {
      opacity: 1;
      font-weight: 600;
      color: $color-accent-ink;
    }
  }

  &__prio {
    margin-left: 1px;
    font-size: 9px;
    font-variant-numeric: tabular-nums;
  }
}
</style>
