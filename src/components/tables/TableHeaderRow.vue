<script setup lang="ts" generic="TData">
// Универсальный header-row для таблиц на TanStack Table.
// Принимает один HeaderGroup (то, что приходит из `table.getHeaderGroups()`),
// рисует <tr><th> с поддержкой:
//   • клика по th → toggleSorting (если колонка sortable);
//   • индикатора направления сортировки (↑ / ↓);
//   • leading-slot — служебная пустая ячейка слева (для chevron-toggle expand);
//   • meta.hint — значок «i» с пояснением: название колонки вроде «Попередньо»
//     само себя не объясняет, а разворачивать его в заголовок нельзя — шапка
//     таблицы не место для предложения.
//
// Cтили задаёт окружающая таблица через классы .t__th, .t__sort и т.п.

import type {} from '../../types/table'
import { Info } from '@lucide/vue'
import { FlexRender, type HeaderGroup } from '@tanstack/vue-table'
import { computed, inject, watchEffect } from 'vue'
import { TABLE_CARD_KEY } from './tableCard.context'

interface Props {
  headerGroup: HeaderGroup<TData>
  hasLeadingCell?: boolean  // Если у строк есть служебная toggle-ячейка слева (для expand)
  /**
   * Сортировок может быть несколько, и порядок ключей = приоритет. Клик тогда
   * ДОБАВЛЯЕТ ключ в стек, а не заменяет его, и рядом с активной колонкой
   * показывается её номер.
   */
  isMultiSort?: boolean
}

const props = defineProps<Props>()

function onSort(header: HeaderGroup<TData>['headers'][number]): void {
  if (!header.column.getCanSort()) return

  // Цикл (по умолчанию → обратное → снять) считает сам TanStack; второй
  // аргумент решает, добавить ключ в стек или заменить им прежний.
  header.column.toggleSorting(undefined, props.isMultiSort)
}

type Header = HeaderGroup<TData>['headers'][number]

// Другий рядок колонки (meta.sub): підпис під назвою. Сортує свій прихований
// стовпець-носій, а не колонку — тому клік по ньому не доходить до th.
const subOf = (header: Header) => header.column.columnDef.meta?.sub
const subColumnOf = (header: Header) => {
  const sub = subOf(header)
  return sub?.isSortable ? header.getContext().table.getColumn(sub.id) : undefined
}

function onSubSort(header: Header): void {
  subColumnOf(header)?.toggleSorting(undefined, props.isMultiSort)
}

// Є другі рядки — картка навколо показує перемикач щільності.
const hasSub = computed(() => props.headerGroup.headers.some(header => subOf(header) !== undefined))
const card = inject(TABLE_CARD_KEY, null)
watchEffect((onCleanup) => {
  if (card && hasSub.value) onCleanup(card.registerStacked())
})
</script>

<template>
  <tr>
    <th v-if="hasLeadingCell" class="t__th t__th--toggle"></th>
    <th
      v-for="header in headerGroup.headers"
      :key="header.id"
      class="t__th"
      :class="{ 't__th--sortable': header.column.getCanSort() }"
      :style="header.column.columnDef.meta?.align ? { textAlign: header.column.columnDef.meta.align } : undefined"
      @click="onSort(header)"
    >
      <!-- t__th-stack — каркас дворядкової шапки: другий рядок підхоплює
           вирівнювання комірки. Без meta.sub обгортка нічого не змінює. -->
      <span :class="{ 't__th-stack': subOf(header) }">
        <FlexRender :render="header.column.columnDef.header" :props="header.getContext()" />

        <!-- Подсказка на span-обёртке, а не на svg: lucide не пробрасывает внутрь
             дочерний <title>, и tooltip просто не появлялся бы.
             @click.stop — клик по значку не должен менять сортировку. -->
        <span
          v-if="header.column.columnDef.meta?.hint"
          class="t__hint"
          :title="header.column.columnDef.meta.hint"
          @click.stop
        >
          <Info :size="12" />
        </span>
        <span v-if="header.column.getIsSorted()" class="t__sort">
          {{ header.column.getIsSorted() === 'asc' ? '↑' : '↓' }}
          <!-- Номер только когда ключей правда несколько: «1» у единственной
               сортировки ничего не сообщает. -->
          <sup
            v-if="isMultiSort && header.getContext().table.getState().sorting.length > 1"
            class="t__sort-prio"
          >{{ header.column.getSortIndex() + 1 }}</sup>
        </span>

        <template v-if="subOf(header)">
          <button
            v-if="subColumnOf(header)"
            type="button"
            class="t__th-sub t__th-sub--sortable"
            :class="{ 'is-sorted': !!subColumnOf(header)?.getIsSorted() }"
            @click.stop="onSubSort(header)"
          >
            {{ subOf(header)?.header }}
            <span v-if="subColumnOf(header)?.getIsSorted()" class="t__sort">
              {{ subColumnOf(header)?.getIsSorted() === 'asc' ? '↑' : '↓' }}
              <sup
                v-if="isMultiSort && header.getContext().table.getState().sorting.length > 1"
                class="t__sort-prio"
              >{{ (subColumnOf(header)?.getSortIndex() ?? 0) + 1 }}</sup>
            </span>
          </button>
          <span v-else class="t__th-sub">{{ subOf(header)?.header }}</span>
        </template>
      </span>
    </th>
  </tr>
</template>
