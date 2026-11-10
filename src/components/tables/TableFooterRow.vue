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

import type {} from '../../types/table'
import { FlexRender, Header, type HeaderGroup } from '@tanstack/vue-table'
import { computed } from 'vue'

interface Props {
  footerGroup: HeaderGroup<TData>
  hasLeadingCell?: boolean
}

const props = defineProps<Props>()

const getFooterClass = (header: Header<TData, unknown>) => {
  const emphasis =  header.column.columnDef.meta?.emphasis

  if (!emphasis) return ''

  return {
    'totals__positive': emphasis === 'positive',
    'totals__muted': emphasis === 'muted'
  }
}

// Підсумок, вирівняний ліворуч, забирає порожні ячейки праворуч від себе
// (colspan). Інакше довгий підсумок («Усього: 8 160 · показано 100») розпирав
// би свою колонку: вузька «Номер» чи «Дата» ставала вдвічі ширшою, і таблиця
// вилазила за картку. Текст стоїть на тому ж місці, а ширину колонки задають
// рядки. Ячейку з підсумком не забираємо — на неї текст не наїде. Підсумок
// праворуч чи по центру не розтягуємо: він з'їхав би від своєї колонки.
const cells = computed(() => {
  const headers = props.footerGroup.headers
  const result: { header: Header<TData, unknown>, colSpan: number }[] = []

  for (let i = 0; i < headers.length; i++) {
    const header = headers[i]
    const align = header.column.columnDef.meta?.align
    let colSpan = header.colSpan

    if (header.column.columnDef.footer && (!align || align === 'left')) {
      while (i + 1 < headers.length && !headers[i + 1].column.columnDef.footer) {
        colSpan += headers[++i].colSpan
      }
    }

    result.push({ header, colSpan })
  }

  return result
})
</script>

<template>
  <tr class="t__row t__row--totals">
    <td v-if="hasLeadingCell" class="t__td t__td--toggle"></td>
    <td v-for="{ header, colSpan } in cells"
        :key="header.id"
        class="t__td"
        :class="getFooterClass(header)"
        :colspan="colSpan > 1 ? colSpan : undefined"
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
