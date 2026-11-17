<script setup lang="ts">
// Картка навколо таблиці: рамка, область скролу, порожній стан, місце під пейджер.
// Скролиться саме картка, а не сторінка, тому шапка таблиці лишається видимою.
//
// Порожньо й помилка — з дією поруч: «Скинути фільтри» і «Повторити». Без неї
// людина шукала кнопку скидання вгорі й оновлювала всю сторінку.

import { SharedConfig } from '../../config'
import { CircleAlert, FunnelX, Inbox, Rows2, Rows3, RotateCw, SearchX } from '@lucide/vue'
import { computed, provide, ref } from 'vue'
import UiButton from './UiButton.vue'
import UiIconButton from './UiIconButton.vue'
import type { ResettableFilters } from '../../composables/useServerList'
import { TABLE_CARD_KEY } from '../tables/tableCard.context'

withDefaults(defineProps<{
  isEmpty: boolean
  emptyText: string
  /**
   * Запит впав. Окремо від `isEmpty`: порожньо — подивились і не знайшли,
   * помилка — не подивились. Одним рядком на двох таблиця брехала б про фільтри.
   */
  isError?: boolean
  errorText?: string
  /** Стор списку (`store`): звідси «Скинути фільтри» й «Повторити». */
  list?: {
    filters?: ResettableFilters
    data: { isLoading: boolean; refetch?: () => void }
  }
  /** Картка по висоті контенту замість «на весь екран зі своїм скролом». */
  isFitContent?: boolean
}>(), {
  isFitContent: false,
  isError: false,
  errorText: () => SharedConfig.get().labels.tableLoadFailed,
})

// Щільність: перемикач — лише в таблиці з другими рядками колонок (її шапка
// реєструється сама) і лише коли проєкт дав, де тримати вибір.
const stackedCount = ref(0)
provide(TABLE_CARD_KEY, {
  registerStacked: () => {
    stackedCount.value++
    return () => { stackedCount.value-- }
  },
})

const density = SharedConfig.get().tableDensity
const isDensitySwitchable = computed(() => density !== undefined && stackedCount.value > 0)
const isCompact = computed(() => isDensitySwitchable.value && density?.get() === 'compact')

function toggleDensity(): void {
  density?.set(isCompact.value ? 'comfortable' : 'compact')
}
</script>

<template>
  <section class="ui-table-card" :class="{ 'ui-table-card--fit': isFitContent, 'ui-table-card--compact': isCompact }">
    <div v-if="isError" class="ui-table-card__state ui-table-card__state--error" role="alert">
      <CircleAlert :size="20" class="ui-table-card__icon" />
      <p class="ui-table-card__text">{{ errorText }}</p>
      <UiButton
        v-if="list?.data.refetch"
        size="sm"
        :is-loading="list.data.isLoading"
        @click="list.data.refetch()"
      >
        <RotateCw :size="14" />
        {{ SharedConfig.get().labels.retry }}
      </UiButton>
    </div>

    <div v-else-if="isEmpty" class="ui-table-card__state">
      <component :is="list?.filters?.isFiltered ? SearchX : Inbox" :size="20" class="ui-table-card__icon" />
      <p class="ui-table-card__text">{{ emptyText }}</p>
      <UiButton v-if="list?.filters?.isFiltered" size="sm" variant="ghost" @click="list.filters.reset()">
        <FunnelX :size="14" />
        {{ SharedConfig.get().labels.resetFilters }}
      </UiButton>
    </div>

    <div v-else class="ui-table-card__scroll">
      <slot />
    </div>

    <!-- Перемикач — у смузі підвалу праворуч, з тією ж рамкою й фоном: лінія
         підвалу йде суцільна, а лічильник чи пейджер лишаються ліворуч. -->
    <div v-if="isDensitySwitchable && !isEmpty && !isError" class="ui-table-card__bottom">
      <div class="ui-table-card__footer"><slot name="footer" /></div>
      <div class="ui-table-card__density">
        <UiIconButton
          variant="ghost"
          tone="muted"
          :aria-pressed="isCompact"
          :aria-label="isCompact ? density?.labels.toComfortable : density?.labels.toCompact"
          :title="isCompact ? density?.labels.toComfortable : density?.labels.toCompact"
          @click="toggleDensity"
        >
          <component :is="isCompact ? Rows2 : Rows3" :size="16" />
        </UiIconButton>
      </div>
    </div>
    <slot v-else-if="!isEmpty && !isError" name="footer" />
  </section>
</template>

<style scoped lang="scss">
.ui-table-card {
  // max-height обмежує картку висотою екрана, min-height: 0 дозволяє
  // flex-дитині стискатись нижче свого контенту — без нього картка
  // розпирала б сторінку, і скрол їхав би на body.
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  background: $color-surface;
  border: 1px solid $color-border;
  border-radius: 12px;
  overflow: hidden;

  &--fit {
    max-height: none;
    flex: none;
  }

  &__state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 40px 16px;
    text-align: center;
    color: $color-muted;

    &--error { color: $color-danger; }
  }

  &__icon { opacity: 0.7; }

  &__text {
    margin: 0;
    max-width: 420px;
    font-size: 14px;
  }

  // flex: 1 — область скролу забирає весь простір картки, що лишився від
  // пейджера; вона й скролиться, шапка та пейджер лишаються на місці.
  &__scroll {
    overflow: auto;
    flex: 1;
  }

  // Підвал лишається як був (зі своєю рамкою й фоном), поруч — клітинка
  // перемикача з тією ж рамкою: stretch тягне її на висоту підвалу.
  &__bottom {
    display: flex;
    align-items: stretch;
  }

  &__footer {
    flex: 1;
    min-width: 0;
  }

  &__density {
    display: flex;
    align-items: center;
    padding: 0 8px;
    border-top: 1px solid $color-border;
    background: $color-page-bg;
  }
}
</style>
