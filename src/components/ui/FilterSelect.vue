<script setup lang="ts" generic="T extends string | number">
// Дропдаун фільтра з пошуком. Заміна розсипу чипів: коли варіантів більше двох,
// чипи розповзаються в кілька рядів і ламають розкладку панелі фільтрів.
//
// Два режими, але modelValue ЗАВЖДИ масив — щоб не плодити два компоненти
// і не робити умовну типізацію пропсів:
//   • multiple      — звичайний мультивибір;
//   • без multiple  — одиничний вибір (бек більшості фільтрів приймає скаляр).
//     Клік замінює вибір і закриває список; на місці виклику адаптуємо
//     скаляр ↔ масив (`:model-value="x ? [x] : []"`).
//
// Побудований на reka-ui Combobox (a11y, клавіатура, focus-trap, dismiss).
// Позиціювання popper: avoidCollisions (дефолт) сам перевертає список угору,
// якщо знизу мало місця; висота обмежена --reka-popper-available-height, тому
// список не вилазить за екран, а скролиться всередині.
//
// Компонент app-agnostic: усі тексти приходять пропсами (лежить у _shared).

import { Check, ChevronDown, Search, X } from '@lucide/vue'
import {
  ComboboxAnchor,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxPortal,
  ComboboxRoot,
  ComboboxTrigger,
  ComboboxViewport,
} from 'reka-ui'
import { computed, ref, watch } from 'vue'
import { useFuzzySearch } from '../../composables/useFuzzySearch'
import { SharedConfig } from '../../config'
import type { FilterOption as Option, FilterPage } from './filterSelect.types'

// Нижче цього порогу поле пошуку — лише шум: три пункти видно й так.
const SEARCH_THRESHOLD = 8

// Пауза між символами пошуку, після якої йде запит сторінки (віддалений режим).
const SEARCH_DEBOUNCE_MS = 200

const props = withDefaults(defineProps<{
  modelValue: T[]
  // Локальний список. Довідник без меж (тисячі авто, водіїв) — fetchPage.
  options?: Array<Option<T>>
  // Віддалений режим: сторінка за пошуком; список вантажиться при відкритті,
  // пошук — із паузою, далі «Показати ще». Застарілі відповіді відкидаються.
  fetchPage?: (query: string, page: number) => Promise<FilterPage<T>>
  // Підпис уже обраного значення, якого немає на завантажених сторінках (з адреси).
  fetchById?: (value: T) => Promise<Option<T> | null>
  // Текст, коли нічого не обрано (він же — назва фільтра, тому окремий
  // заголовок поруч не потрібен).
  placeholder: string
  multiple?: boolean
  searchPlaceholder?: string
  // Текст порожнього результату пошуку. Дефолт нейтральний — мова у _shared не хардкодиться.
  emptyText?: string
  disabled?: boolean
  // Обрані ВСІ опції → на кнопці знову placeholder (галочки в списку лишаються).
  placeholderWhenAll?: boolean
}>(), { options: () => [] })

const emit = defineEmits<{
  'update:modelValue': [value: T[]]
}>()

const isOpen = ref(false)

const isSearchable = computed(() => Boolean(props.fetchPage) || props.options.length >= SEARCH_THRESHOLD)

// Пошук наш, а не вбудований у reka-ui (ignoreFilter): той бере лише точний
// підрядок, тож одруківка чи інший порядок слів давали б порожній список.
const searchTerm = ref('')
const localOptions = useFuzzySearch(() => props.options, searchTerm, ['label'])

// ----- Віддалений довідник (fetchPage) --------------------------------------
const remoteOptions = ref<Array<Option<T>>>([]) as { value: Array<Option<T>> }
const page = ref(0)
const lastPage = ref(1)
const isLoading = ref(false)
const isLoadFailed = ref(false)
// Підписи обраних: обране лишається підписаним, коли пошук його відфільтрував.
const knownLabels = ref(new Map<T, Option<T>>()) as { value: Map<T, Option<T>> }
let requestId = 0
let searchTimer: ReturnType<typeof setTimeout> | undefined

const visibleOptions = computed(() => (props.fetchPage ? remoteOptions.value : localOptions.value))

async function loadPage(reset: boolean): Promise<void> {
  if (!props.fetchPage) return
  const next = reset ? 1 : page.value + 1
  const id = ++requestId
  isLoading.value = true
  isLoadFailed.value = false
  if (reset) remoteOptions.value = []
  try {
    const result = await props.fetchPage(searchTerm.value.trim(), next)
    // Відповідь на старіший запит (людина вже друкує далі) — відкидаємо.
    if (id !== requestId) return
    const known = new Set(remoteOptions.value.map(o => o.value))
    remoteOptions.value = [...remoteOptions.value, ...result.items.filter(o => !known.has(o.value))]
    for (const o of result.items) knownLabels.value.set(o.value, o)
    page.value = next
    lastPage.value = result.lastPage
  } catch (error) {
    if (id !== requestId) return
    // Збій показано на місці («Повторити») — у проєкт лише для трекінгу.
    isLoadFailed.value = true
    SharedConfig.get().reportError?.(error)
  } finally {
    if (id === requestId) isLoading.value = false
  }
}

watch(searchTerm, () => {
  if (!props.fetchPage || !isOpen.value) return
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => void loadPage(true), SEARCH_DEBOUNCE_MS)
})

watch(() => props.modelValue, async (values) => {
  if (!props.fetchById) return
  for (const value of values) {
    if (knownLabels.value.has(value)) continue
    const option = await props.fetchById(value).catch((error: unknown) => {
      SharedConfig.get().reportError?.(error)
      return null
    })
    if (option) knownLabels.value.set(value, option)
  }
}, { immediate: true })

function optionOf(value: T): Option<T> | undefined {
  return props.options.find(o => o.value === value) ?? knownLabels.value.get(value)
}

const labels = SharedConfig.get().labels

// Список закрили — запит скидаємо, інакше наступне відкриття почнеться з
// відфільтрованого списку, а поле вводу reka-ui вже порожнє.
watch(isOpen, (open) => {
  if (open && props.fetchPage && page.value === 0) void loadPage(true)
  if (open) return
  clearTimeout(searchTimer)
  // Закрили з пошуком — наступне відкриття почне список спочатку.
  if (props.fetchPage && searchTerm.value.trim()) page.value = 0
  searchTerm.value = ''
})

// Підпис на кнопці: один обраний — його лейбл, кілька — перший + лічильник.
// Перелічувати всі підряд немає сенсу: кнопка розтягнеться так само, як чипи.
const triggerLabel = computed<string>(() => {
  if (props.modelValue.length === 0) return props.placeholder
  if (props.placeholderWhenAll && props.modelValue.length === props.options.length) return props.placeholder

  const firstOpt = optionOf(props.modelValue[0])
  const first = firstOpt?.short ?? firstOpt?.label ?? String(props.modelValue[0])
  if (props.modelValue.length === 1) return first

  return `${first} +${props.modelValue.length - 1}`
})

function clear(): void {
  emit('update:modelValue', [])
}

// ComboboxRoot типізує payload як T (одиничне значення) незалежно від `multiple`,
// хоча в рантаймі з `multiple` приходить масив. Звужуємо самі.
function onSelect(value: unknown): void {
  for (const o of remoteOptions.value) {
    if (Array.isArray(value) ? value.includes(o.value) : value === o.value) knownLabels.value.set(o.value, o)
  }

  if (props.multiple) {
    emit('update:modelValue', Array.isArray(value) ? (value as T[]) : [])
    return
  }

  // Одиничний режим: null/undefined = зняли вибір.
  emit('update:modelValue', value === null || value === undefined ? [] : [value as T])
  isOpen.value = false
}
</script>

<template>
  <ComboboxRoot
    v-model:open="isOpen"
    :model-value="multiple ? modelValue : (modelValue[0] ?? null)"
    :multiple="multiple"
    :disabled="disabled"
    ignore-filter
    class="fs"
    @update:model-value="onSelect"
  >
    <ComboboxAnchor class="fs__anchor">
      <ComboboxTrigger
        class="fs__trigger"
        :class="{ 'fs__trigger--filled': modelValue.length > 0 }"
      >
        <span class="fs__label">{{ triggerLabel }}</span>
        <ChevronDown class="fs__chevron" :class="{ 'fs__chevron--open': isOpen }" :size="14" />
      </ComboboxTrigger>

      <!-- Хрестик поза тригером: клік по ньому не має відкривати список. -->
      <button
        v-if="modelValue.length > 0 && !disabled"
        type="button"
        class="fs__clear"
        :aria-label="placeholder"
        @click.stop="clear"
      >
        <X :size="12" />
      </button>
    </ComboboxAnchor>

    <ComboboxPortal>
      <ComboboxContent position="popper" :side-offset="4" class="fs__content">
        <div v-if="isSearchable" class="fs__search">
          <Search :size="13" class="fs__search-icon" />
          <!-- display-value: без нього reka-ui в одиночному режимі кладе в поле
               пошуку сире значення обраного пункту (id, `cash_deposit`). -->
          <ComboboxInput
            v-model="searchTerm"
            :display-value="() => ''"
            class="fs__search-input"
            :placeholder="searchPlaceholder"
          />
        </div>

        <ComboboxViewport class="fs__viewport">
          <!-- ignore-filter вимикає й підрахунок збігів у reka-ui, тому порожній
               стан показуємо самі. -->
          <div v-if="isLoadFailed" class="fs__empty" role="alert">
            {{ labels.loadFailed }}
            <button type="button" class="fs__more" @click="loadPage(page === 0)">{{ labels.retry }}</button>
          </div>
          <div v-else-if="isLoading && !visibleOptions.length" class="fs__empty" role="status">
            {{ labels.loading }}
          </div>
          <div v-else-if="!visibleOptions.length" class="fs__empty">
            {{ emptyText ?? '—' }}
          </div>

          <ComboboxItem
            v-for="opt in visibleOptions"
            :key="String(opt.value)"
            :value="opt.value"
            class="fs__item"
          >
            <span
              class="fs__check"
              :class="[
                { 'fs__check--on': modelValue.includes(opt.value) },
                multiple ? 'fs__check--box' : 'fs__check--dot',
              ]"
            >
              <Check v-if="modelValue.includes(opt.value)" :size="11" />
            </span>
            <span class="fs__item-label">{{ opt.label }}</span>
          </ComboboxItem>

          <button
            v-if="fetchPage && !isLoadFailed && page > 0 && page < lastPage"
            type="button"
            class="fs__more"
            :disabled="isLoading"
            @click="loadPage(false)"
          >
            {{ isLoading ? labels.loading : labels.loadMore }}
          </button>
        </ComboboxViewport>
      </ComboboxContent>
    </ComboboxPortal>
  </ComboboxRoot>
</template>

<style scoped lang="scss">
.fs {
  position: relative;
  display: inline-flex;

  &__anchor {
    display: inline-flex;
    align-items: center;
    position: relative;
  }

  &__trigger {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 32px;
    max-width: 220px;
    padding: 0 10px;
    background: $color-surface;
    border: 1px solid $color-border;
    border-radius: 999px;
    font-size: 12px;
    color: $color-text;
    transition: border-color 0.15s ease, background 0.15s ease;

    &:hover:not(:disabled) { border-color: $color-border-strong; }

    &:focus-visible {
      outline: none;
      border-color: $color-accent;
      box-shadow: 0 0 0 3px $color-accent-dim;
    }

    &:disabled { opacity: 0.5; }

    // Активний фільтр — м'яка заливка, не насичений акцент: у ряду фільтрів
    // кілька залитих кнопок поспіль виглядають як помилка.
    // padding-right — місце під хрестик, щоб текст під нього не заповзав.
    &--filled {
      padding-right: 26px;
      background: $color-accent-dim;
      border-color: $color-accent;
      color: $color-accent-ink;
    }
  }

  &__label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__chevron {
    flex-shrink: 0;
    color: $color-muted;
    transition: transform 0.15s ease;

    &--open { transform: rotate(180deg); }
  }

  &__clear {
    position: absolute;
    right: 8px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
    border: none;
    border-radius: 999px;
    background: transparent;
    color: $color-accent-ink;
    opacity: 0.6;

    &:hover { opacity: 1; }
  }
}
</style>

<style lang="scss">
// Список рендериться в портал (поза деревом компонента), тому scoped-стилі
// до нього не дістають — ці класи глобальні.
.fs__content {
  // Вище оверлея модалки (BaseModal — 999): селект живе і всередині модалки,
  // а рендериться в портал на body, тож нижчий z-index ховав би список під нею.
  z-index: 1000;
  display: flex;
  flex-direction: column;
  // Ширина за тригером, але не вужче читабельного і не ширше екрана (мобілка).
  min-width: max(var(--reka-popper-anchor-width), 200px);
  max-width: min(320px, calc(100vw - 24px));
  // Popper рахує доступну висоту з урахуванням перевороту вгору/вниз —
  // список ніколи не вилізе за екран, а почне скролитись.
  max-height: min(320px, var(--reka-popper-available-height, 320px));
  background: $color-surface;
  border: 1px solid $color-border;
  border-radius: 10px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.fs__search {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  padding: 8px 10px;
  border-bottom: 1px solid $color-border;
}

.fs__search-icon { color: $color-muted; flex-shrink: 0; }

.fs__search-input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-size: 13px;
  color: $color-text;

  &::placeholder { color: $color-muted; }
}

.fs__viewport {
  padding: 4px;
  overflow-y: auto;
  // Щоб скрол списку не «протікав» у сторінку під ним.
  overscroll-behavior: contain;

  // Тонкий скрол, щоб не з'їдав ширину списку.
  scrollbar-width: thin;
  scrollbar-color: $color-border transparent;

  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-thumb {
    background: $color-border;
    border-radius: 999px;
  }
}

.fs__empty {
  padding: 12px 10px;
  font-size: 12px;
  color: $color-muted;
  text-align: center;
}

// «Показати ще» / «Повторити» віддаленого режиму.
.fs__more {
  display: block;
  width: 100%;
  margin-top: 4px;
  padding: 6px 10px;
  border: 0;
  border-radius: 6px;
  background: none;
  color: $color-accent-ink;
  font: inherit;
  font-size: 12px;
  cursor: pointer;

  &:hover:not(:disabled) { background: $color-accent-dim; }
  &:disabled { color: $color-muted; cursor: default; }
}

.fs__item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 8px;
  border-radius: $radius;
  font-size: 13px;
  color: $color-text;
  cursor: pointer;
  user-select: none;

  // Клавіатурна навігація reka-ui ставить саме цей атрибут.
  &[data-highlighted] { background: $color-page-bg; }

  // На мобільному тап-таргет має бути крупнішим за 32px.
  @media (hover: none) {
    padding: 10px 8px;
  }
}

.fs__check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 15px;
  height: 15px;
  border: 1px solid $color-border;
  background: $color-surface;
  color: $color-surface;

  // Квадрат = «можна обрати кілька», коло = «лише один». Форма підказує
  // режим ще до кліку.
  &--box { border-radius: 4px; }
  &--dot { border-radius: 999px; }

  &--on {
    background: $color-accent;
    border-color: $color-accent;
  }
}

.fs__item-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
