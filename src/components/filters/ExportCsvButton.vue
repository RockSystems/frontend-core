<script setup lang="ts">
// Кнопка вивантаження CSV у рядку фільтрів (слот #toolbar у FiltersBar).
//
// Тримає всю взаємодію разом: спінер, підпис із періодом і тост про хід справи.
// Фіча дає лише «що запустити» — інакше кожна сторінка заводила б свій
// toast.promise з тими самими текстами, і вони розходились би.

import { Download, Loader2 } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { SharedConfig } from '../../config'
import type { Period } from '../../helpers/period.helper'
import UiButton from '../ui/UiButton.vue'

const labels = SharedConfig.get().labels

const props = defineProps<{
  // Запускає вивантаження і віддає імʼя файла, під яким його збережено.
  run: () => Promise<string>
  isExporting: boolean
  // Тільки для підпису — щоб було видно, за що саме поїде файл.
  period: Period
  // Чим файл відрізняється від екрана, якщо відрізняється (напр. розріз).
  note?: string
}>()

// Один тост на весь шлях: вивантаження за великий період довге.
//
// `error` навмисно не заданий — помилку вже показує onError мутації, а без
// цього ключа sonner просто прибирає тост замість того, щоб дублювати її другим.
function exportCsv(): void {
  toast.promise(props.run(), {
    loading: labels.exportPreparing,
    success: (filename: string) => labels.exportDone(filename),
  })
}
</script>

<template>
  <UiButton
    variant="ghost"
    size="sm"
    :disabled="isExporting"
    :title="labels.exportTitle(period.from, period.to, note)"
    @click="exportCsv"
  >
    <component
      :is="isExporting ? Loader2 : Download"
      :size="14"
      :class="{ 'export-csv__spin': isExporting }"
    />
    Export CSV
  </UiButton>
</template>

<style scoped lang="scss">
// Слот-контент належить ЦЬОМУ компоненту, тож анімація живе тут, а не в
// фільтрах, які його показують.
.export-csv__spin { animation: export-csv-spin 1s linear infinite; }
@keyframes export-csv-spin { to { transform: rotate(360deg); } }
</style>
