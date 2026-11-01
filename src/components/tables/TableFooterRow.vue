<script setup lang="ts" generic="TData">
// Универсальный footer-row для таблиц на TanStack Table.
// Принимает один HeaderGroup от table.getFooterGroups() и рендерит <tr><td>
// через columnDef.footer (FlexRender).
//
// Итог берётся из columnDef.footer колонки. Это ИТОГ ПО ВСЕЙ ВЫБОРКЕ фильтра
// (агрегат бэка рядом с пагинацией), а не сумма видимых строк: подпись под
// таблицей читают как итог периода, а сумма страницы менялась бы от per_page.
// Если колонка не определила footer — ячейка пустая.
//
// Стили задаёт окружающая таблица (классы .t__th, .t__td, .t__row--totals).

import { FlexRender, Header, type HeaderGroup } from '@tanstack/vue-table'

interface Props {
  footerGroup: HeaderGroup<TData>
  hasLeadingCell?: boolean
}

const getFooterClass = (header: Header<TData, unknown>) => {
  const emphasis =  header.column.columnDef.meta?.emphasis

  if (!emphasis) return ''

  return {
    'totals__positive': emphasis === 'positive',
    'totals__muted': emphasis === 'muted'
  }
}

defineProps<Props>()
</script>

<template>
  <tr class="t__row t__row--totals">
    <td v-if="hasLeadingCell" class="t__td t__td--toggle"></td>
    <td v-for="header in footerGroup.headers"
        :key="header.id"
        class="t__td"
        :class="getFooterClass(header)"
        :style="header.column.columnDef.meta?.align ? { textAlign: header.column.columnDef.meta.align } : undefined"
    >
      <FlexRender :render="header.column.columnDef.footer" :props="header.getContext()" />
    </td>
  </tr>
</template>

<style scoped lang="scss">
.totals {
  &__positive { color: $color-green-ink; }
  &__muted { color: $color-muted; font-weight: 500; }
}
</style>
