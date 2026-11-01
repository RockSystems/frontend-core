<script setup lang="ts">
// Бінарний бейдж таблиці: «Парк / Водія», «VIP / Звичайний», «Так / Ні».
//
// Живе в shared, а не в _shared: дефолтні лейбли українські, тобто компонент
// знає мову застосунку — у кроспроєктному ядрі йому не місце.
//
// Форма/кольори — UiBadge. Хибне значення завжди нейтральне: «ні» це не
// помилка, червонити його нема за що.

import { SharedConfig } from '../../../config'
import UiBadge from '../../ui/UiBadge.vue'
import type { UiBadgeTone } from '../../ui/uiBadge.types'

withDefaults(defineProps<{
  value: boolean
  trueLabel?: string
  falseLabel?: string
  // Тон лише для істинного значення — сенс «так» різний: «наша машина» це
  // добре (success), а «є борг» радше danger.
  trueTone?: UiBadgeTone
}>(), {
  trueLabel: () => SharedConfig.get().labels.yes,
  falseLabel: () => SharedConfig.get().labels.no,
  trueTone: 'success',
})
</script>

<template>
  <UiBadge :tone="value ? trueTone : 'neutral'" size="sm">
    {{ value ? trueLabel : falseLabel }}
  </UiBadge>
</template>
