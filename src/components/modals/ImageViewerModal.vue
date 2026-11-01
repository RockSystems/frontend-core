<script setup lang="ts">
// Простий переглядач зображень (lightbox). Тільки перегляд — жодних дій над файлом.
// Зум: колесо миші (у точку курсора) або подвійний клік. Пан: перетягування, коли наближено.
// Закрити: × або Esc (область клавіш модалки, BaseModal).

import { X } from '@lucide/vue'
import { computed, ref } from 'vue'
import { SharedConfig } from '../../config'
import { useCurrentModal } from '../../plugins/modals.plugin'

interface Props {
  url: string
  name?: string
}

defineProps<Props>()

const { close } = useCurrentModal()

const MIN_SCALE = 1
const MAX_SCALE = 5
const DBL_CLICK_SCALE = 2.5
const WHEEL_STEP = 1.15

const stage = ref<HTMLElement | null>(null)
const scale = ref(MIN_SCALE)
const offset = ref({ x: 0, y: 0 })
const isPanning = ref(false)
let panStart = { x: 0, y: 0, offsetX: 0, offsetY: 0 }

const isZoomed = computed(() => scale.value > MIN_SCALE)
const imageStyle = computed(() => ({
  transform: `translate(${offset.value.x}px, ${offset.value.y}px) scale(${scale.value})`,
}))

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function reset() {
  scale.value = MIN_SCALE
  offset.value = { x: 0, y: 0 }
}

// Зум у точку курсора: точка під ним лишається на місці.
// offset' = c - (c - offset) * (scale' / scale), де c — курсор відносно центру сцени.
function zoomAt(clientX: number, clientY: number, nextScale: number) {
  const el = stage.value
  if (!el) return

  const next = clamp(nextScale, MIN_SCALE, MAX_SCALE)
  if (next === MIN_SCALE) { reset(); return }

  const rect = el.getBoundingClientRect()
  const cursorX = clientX - (rect.left + rect.width / 2)
  const cursorY = clientY - (rect.top + rect.height / 2)
  const ratio = next / scale.value

  offset.value = {
    x: cursorX - (cursorX - offset.value.x) * ratio,
    y: cursorY - (cursorY - offset.value.y) * ratio,
  }
  scale.value = next
}

function onWheel(event: WheelEvent) {
  event.preventDefault()
  zoomAt(event.clientX, event.clientY, scale.value * (event.deltaY < 0 ? WHEEL_STEP : 1 / WHEEL_STEP))
}

function onDblClick(event: MouseEvent) {
  if (isZoomed.value) reset()
  else zoomAt(event.clientX, event.clientY, DBL_CLICK_SCALE)
}

function onPointerDown(event: PointerEvent) {
  if (!isZoomed.value) return
  isPanning.value = true
  panStart = { x: event.clientX, y: event.clientY, offsetX: offset.value.x, offsetY: offset.value.y }
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

function onPointerMove(event: PointerEvent) {
  if (!isPanning.value) return
  offset.value = {
    x: panStart.offsetX + (event.clientX - panStart.x),
    y: panStart.offsetY + (event.clientY - panStart.y),
  }
}

function onPointerUp(event: PointerEvent) {
  if (!isPanning.value) return
  isPanning.value = false
  ;(event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId)
}

</script>

<template>
  <div class="viewer">
    <div
      ref="stage"
      class="viewer__stage"
      :class="{
        'viewer__stage--zoomed': isZoomed,
        'viewer__stage--panning': isPanning,
      }"
      @wheel="onWheel"
      @dblclick="onDblClick"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
    >
      <img
        class="viewer__img"
        :class="{ 'viewer__img--smooth': !isPanning }"
        :src="url"
        :alt="name ?? ''"
        :style="imageStyle"
        draggable="false"
      />

      <button type="button" class="viewer__close" :aria-label="SharedConfig.get().labels.close" @click="close()">
        <X :size="18" />
      </button>
    </div>

    <p v-if="name" class="viewer__caption">{{ name }}</p>
  </div>
</template>

<style scoped lang="scss">
.viewer {
  position: relative;
  margin: auto; // .modal-block має align-items: flex-start — центруємо самі
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  max-width: 100%;

  &__stage {
    position: relative;
    overflow: hidden; // кадруємо наближену картинку по рамці
    border-radius: 12px;
    background: rgba(15, 20, 30, 0.4);
    line-height: 0;
    cursor: zoom-in;
    touch-action: none; // щоб пан пальцем не скролив сторінку

    &--zoomed { cursor: grab; }
    &--panning { cursor: grabbing; }
  }

  &__img {
    display: block;
    max-width: min(92vw, 1200px);
    max-height: 78vh;
    object-fit: contain;
    user-select: none;
    will-change: transform;

    // Плавно — лише для зуму. Під час пану анімація «мазала» б за курсором.
    &--smooth { transition: transform 120ms ease-out; }
  }

  &__close {
    position: absolute;
    top: 8px;
    right: 8px;

    width: 32px;
    height: 32px;
    display: inline-flex;
    align-items: center;
    justify-content: center;

    border: none;
    border-radius: 50%;
    background: rgba(15, 20, 30, 0.55);
    color: #fff;

    transition: background-color 120ms ease;

    &:hover { background: rgba(15, 20, 30, 0.8); }
  }

  &__caption {
    margin: 0;
    max-width: 100%;
    font-size: 12px;
    color: #fff;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
