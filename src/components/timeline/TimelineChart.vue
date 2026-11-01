<script setup lang="ts">
// Смуга періодів: доріжка на кожен вид, смужка з підписом на кожен період.
//
// Всередині — vis-timeline. Своя реалізація не тягнула трьох речей, які тут
// обов'язкові: підписи всередині смужок без наїздів, укладку ОДНОЧАСНИХ періодів
// у стек (у водія буває дві машини разом) і справжню вісь з назвами місяців та
// зумом. Це рівно те, що бібліотека вміє з коробки.
//
// Своїм лишилось схлопування порожнеч: у vis це `hiddenDates`, а які саме
// проміжки різати — рахує наш TimelineScaleHelper.
//
// Чорна скриня: назовні ті самі `lanes` і `size`, що були у власної версії, тож
// заміна нутрощів не зачепила жодного місця виклику. Ні домену, ні мови тут
// немає — назви місяців приходять пропом.

// DataSet — з `vis-data`, хоч рантайм standalone-збірки й має свою копію:
// пакет мапить типи всіх своїх входів на `declarations/index.d.ts`, а той
// DataSet лише імпортує й далі НЕ реекспортує. Тягнути його з peer-пакета —
// не обхід, а штатний шлях: у vis-timeline `vis-data` і є peer-залежність.
import { DataSet } from 'vis-data'
import { Timeline, type TimelineOptions } from 'vis-timeline/standalone'
import 'vis-timeline/styles/vis-timeline-graph2d.css'
import { computed, onBeforeUnmount, onMounted, useTemplateRef, watch } from 'vue'
import { TimelineScaleHelper } from '../../helpers/timelineScale.helper'
import type { TimelineLane } from './timeline.types'

const props = withDefaults(defineProps<{
  lanes: TimelineLane[]
  size?: 'sm' | 'md'
  /** Показуємо, коли в жодній доріжці немає періодів. */
  emptyText: string
  /** Назва місяця для осі. Не задано — лишається числом. */
  formatMonth?: (date: Date) => string
}>(), { size: 'md' })

const container = useTemplateRef<HTMLElement>('container')
let timeline: Timeline | null = null

const isEmpty = computed(() => props.lanes.every(lane => !lane.items.length))

const spans = computed(() =>
  props.lanes.flatMap(lane => lane.items.map(i => ({ from: i.from, to: i.to }))),
)

const groups = computed(() => props.lanes.map(lane => ({ id: lane.id, content: lane.label })))

const items = computed(() => props.lanes.flatMap(lane =>
  lane.items.map(item => ({
    id: item.id,
    group: lane.id,
    content: item.label,
    title: item.title,
    start: item.from,
    // Відкритий період тягнеться до сьогодні: кінця в нього немає, і власної
    // дати ми не вигадуємо — просто ведемо смужку до поточного дня.
    end: item.to ?? new Date(),
    className: `tlv-item tlv-item--${item.tone}`,
    type: 'range' as const,
  })),
))

function buildOptions(): TimelineOptions {
  const extent = TimelineScaleHelper.extent(spans.value)

  return {
    stack: true,
    stackSubgroups: true,
    selectable: false,
    editable: false,
    zoomable: true,
    moveable: true,
    showCurrentTime: true,
    orientation: { axis: 'bottom', item: 'top' },
    margin: { item: { horizontal: 0, vertical: 4 }, axis: 4 },
    // Порожні місяці не з'їдають ширину — правило те саме, що було у власної
    // шкали (зливаємо близьке, ріжемо лише великі проміжки).
    hiddenDates: TimelineScaleHelper.gaps(spans.value),
    ...(extent ? { min: extent.from, max: extent.to } : {}),
    zoomMin: 1000 * 60 * 60 * 24 * 7,
    maxHeight: props.size === 'sm' ? 200 : 320,
    // Назви місяців беремо з пропа, а не з локалі moment: локаль довелось би
    // тягнути в бандл, а компонент має лишатись без мови.
    format: {
      minorLabels: (date: Date, scale: string) =>
        (scale === 'month' && props.formatMonth ? props.formatMonth(date) : ''),
      majorLabels: (date: Date, scale: string) =>
        (scale === 'month' ? String(date.getFullYear()) : ''),
    },
  } as TimelineOptions
}

function render(): void {
  if (!container.value || isEmpty.value) return

  if (!timeline) {
    timeline = new Timeline(
      container.value,
      new DataSet(items.value),
      new DataSet(groups.value),
      buildOptions(),
    )
    return
  }

  timeline.setOptions(buildOptions())
  timeline.setGroups(new DataSet(groups.value))
  timeline.setItems(new DataSet(items.value))
}

onMounted(render)

// Дані приїжджають запитом уже після монтування, тож перемальовуємо на зміну.
watch([items, groups], render, { flush: 'post' })

onBeforeUnmount(() => {
  timeline?.destroy()
  timeline = null
})
</script>

<template>
  <div class="tlv" :class="`tlv--${size}`">
    <p v-if="isEmpty" class="tlv__empty">{{ emptyText }}</p>
    <div v-else ref="container" class="tlv__canvas" />
  </div>
</template>

<style scoped lang="scss">
// vis малює свій DOM сам, тож до нього дістаємось через :deep. Мета — прибрати
// його «зі стоку» вигляд: наші кольори, дрібніший шрифт, тонкі лінії сітки.
.tlv {
  width: 100%;
  min-width: 0;

  &__empty {
    margin: 0;
    font-size: 13px;
    color: $color-muted;
    font-style: italic;
  }

  :deep(.vis-timeline) {
    border: none;
    font-family: inherit;
    font-size: 11px;
    color: $color-text;
  }

  // Сітка й вісь — тихо: це фон, а не зміст.
  :deep(.vis-panel),
  :deep(.vis-time-axis .vis-grid.vis-minor) {
    border-color: $color-border;
  }

  :deep(.vis-time-axis .vis-grid.vis-major) { border-color: $color-border; }

  :deep(.vis-time-axis .vis-text) {
    color: $color-muted;
    padding-top: 2px;
  }

  :deep(.vis-time-axis .vis-text.vis-major) {
    color: $color-text;
    font-weight: 600;
  }

  // Назви доріжок — як підписи полів у решті інтерфейсу.
  :deep(.vis-labelset .vis-label) {
    border-color: $color-border;
    color: $color-muted;
  }

  :deep(.vis-labelset .vis-label .vis-inner) { padding: 4px 8px; }

  :deep(.vis-panel.vis-left) { border-color: $color-border; }

  // Смужка періоду: підпис усередині, тон — з домену.
  :deep(.vis-item) {
    border-width: 1px;
    border-radius: $radius;
    font-size: 11px;
    line-height: 1.2;
  }

  :deep(.vis-item .vis-item-content) { padding: 2px 6px; }

  :deep(.tlv-item--success) { background: $color-green-soft; border-color: $color-green; color: $color-green-ink; }
  :deep(.tlv-item--warning) { background: $color-warning-soft; border-color: $color-warning-ink; color: $color-warning-ink; }
  :deep(.tlv-item--danger) { background: $color-danger-soft; border-color: $color-danger; color: $color-danger-ink; }
  :deep(.tlv-item--info) { background: $color-teal-soft; border-color: $color-teal-ink; color: $color-teal-ink; }
  :deep(.tlv-item--accent) { background: $color-accent-dim; border-color: $color-accent; color: $color-accent-ink; }
  :deep(.tlv-item--neutral) { background: $color-neutral-soft; border-color: $color-neutral-ink; color: $color-neutral-ink; }

  // «Сьогодні» — єдина яскрава лінія: до неї прив'язані всі відкриті періоди.
  :deep(.vis-current-time) { background-color: $color-accent; width: 1px; }

  // Розрив осі там, де вирізано порожній проміжок.
  :deep(.vis-time-axis .vis-grid.vis-hidden-date),
  :deep(.vis-panel .vis-shadow) { background: $color-page-bg; }

  &--sm :deep(.vis-timeline) { font-size: 10px; }
  &--sm :deep(.vis-item) { font-size: 10px; }
}
</style>
