<script setup lang="ts">
import {provide} from "vue";
import {provideHotkeysContext, useHotkey} from "@tanstack/vue-hotkeys";
import {IActiveModal, ModalContextKey} from "../../plugins/modals.plugin";

const props = defineProps<{ instance: IActiveModal }>();
provide(ModalContextKey, props.instance)

// Своя область клавіш на кожну модалку: з однаковою клавішею спрацьовує
// найпізніше відкрита, тож Esc закриває лише верхню, а useHotkey всередині
// модалки перекриває глобальну — до закриття. Свою ж область inject не бачить,
// тому Esc отримує її явно.
const scope = props.instance.uid
provideHotkeysContext({ scope })

// Відкритий reka-поповер (дропдаун) сам закривається по Esc на window — модалка
// під ним лишається. Тому й без stopPropagation: інакше Esc до поповера не дійде.
const POPPER_SELECTOR = '[data-reka-popper-content-wrapper]'

useHotkey('Escape', (event) => {
  // Повтори затиснутої клавіші бібліотека аккордам передає (requireReset — на
  // реєстрацію, а в наступної модалки своя): затиснутий Esc закрив би всі підряд.
  if (event.repeat || event.defaultPrevented || document.querySelector(POPPER_SELECTOR)) return
  event.preventDefault()
  props.instance.close()
}, { scope, preventDefault: false, stopPropagation: false })

// Клік по фону НЕ закриває: промах повз картку стирав набрану форму.
// Закривають хрестиком у самій модалці або Esc (область клавіш вище).
// Коментарів перед кореневим <div> у шаблоні не пишемо: у dev вони роблять корінь
// фрагментом, і TransitionGroup прибирає модалку без анімації закриття.
</script>

<template>
  <div class="modal-block" :id="instance.id">
    <slot>This should have been content</slot>
    <!--<ToTopBtn v-if="$refs.modals" :watchElement="$refs.modals"/>-->
  </div>
</template>

<style lang="scss">
// Overlay: фикс на весь экран, прозрачный затемнённый бэкдроп. Картка не вища за
// екран і скролить свою середину (.modal__body); overflow тут — запас для вікон
// без неї, звичайне вікно overlay не прокручує.
.modal-block {
  position: fixed;
  inset: 0;
  z-index: 999;

  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 40px 24px;

  overflow-y: auto;
  overscroll-behavior: contain;

  @include scrollbarStyle(0);

  @include bigMobile() {
    padding: 16px;
    align-items: stretch;
  }

  // Бэкдроп
  &::before {
    content: "";
    position: fixed;
    inset: 0;
    background-color: rgba(15, 20, 30, 0.32);
    backdrop-filter: blur(4px);
    z-index: -1;
  }

  // ===== Анимации (TransitionGroup name="modal-fade") =======================
  &.modal-fade-enter-active,
  &.modal-fade-leave-active {
    transition: opacity $anim-small-time ease-in-out;

    &::before {
      transition: backdrop-filter $anim-small-time ease-in-out,
                  background-color $anim-small-time ease-in-out;
    }

    & > .modal {
      transition: transform $anim-small-time ease-out,
                  opacity $anim-small-time ease-out;
    }
  }

  &.modal-fade-enter-from,
  &.modal-fade-leave-to {
    opacity: 0;

    &::before {
      backdrop-filter: blur(0);
      background-color: rgba(15, 20, 30, 0);
    }

    & > .modal {
      transform: translateY(12px) scale(0.98);
      opacity: 0;
    }
  }
}

// ===== Сама карточка ========================================================
.modal {
  position: relative;

  width: 100%;
  max-width: 480px;
  // Не вища за екран: шапка й кнопки лишаються на місці, скролиться тіло.
  max-height: 100%;
  min-height: 0;
  margin: auto;
  padding: 20px;

  display: flex;
  flex-direction: column;
  gap: 16px;

  background-color: $color-surface;
  border: 1px solid $color-border;
  border-radius: 12px;
  box-shadow:
    0 1px 2px rgba(15, 20, 30, 0.04),
    0 12px 32px rgba(15, 20, 30, 0.08);

  @include bigMobile() {
    max-width: none;
    margin: auto 0;
  }

  // ----- Заголовок ----------------------------------------------------------
  &__header {
    flex: none;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
  }

  &__title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    line-height: 1.3;
    color: $color-text;
  }

  &__subtitle {
    margin: 4px 0 0;
    font-size: 13px;
    line-height: 1.4;
    color: $color-muted;

    b { color: $color-text; font-weight: 600; }
  }

  // ----- Тело ----------------------------------------------------------------
  // Стили полей — глобально в SmartField (.smart-field), не здесь.
  &__body {
    display: flex;
    flex-direction: column;
    gap: 12px;
    // relative: абсолютні нащадки (сховані input чекбоксів) рахуються від тіла
    // й скроляться з ним, а не розпирають overlay.
    position: relative;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    // Поле біля краю тіла не має обрізати кільце фокусу: запас усередині,
    // відступ картки той самий.
    margin: -4px -20px;
    padding: 4px 20px;

    @include scrollbarStyle;
  }

  &__note {
    margin: 0;
    font-size: 12px;
    color: $color-muted;
  }

  // ----- Футер + кнопки -----------------------------------------------------
  &__footer {
    flex: none;
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding-top: 4px;

    // Split: danger-зона слева, основные действия справа (modal__footer-right).
    &--split { justify-content: space-between; }
  }

  &__footer-right {
    display: inline-flex;
    gap: 8px;
  }

  // Кнопки футера — UiButton: своя кнопка для модалок дала б третій радіус і вагу.
}
</style>

