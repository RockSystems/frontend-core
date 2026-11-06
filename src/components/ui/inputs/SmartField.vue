<script setup lang="ts">
import {Info} from '@lucide/vue';
import {TooltipContent, TooltipPortal, TooltipProvider, TooltipRoot, TooltipTrigger} from 'reka-ui';
import {Field} from 'vee-validate';
import {useId} from 'vue';

defineProps<{
  name: string,
  label: string,
  // Пояснення до поля (не placeholder): чому воно потрібне, що зламається без
  // нього. Живе в підказці біля лейбла, а НЕ рядком під полем: текст під полем
  // є в одних і немає в інших, через що сусідні поля в сітці різної висоти й
  // рядок «рветься». Підказка біля лейбла нічого не зсуває.
  //
  // Сюди НЕ пишемо ні «необовʼязково», ні правило системи прозою — див. §9b
  // в resources/js/CLAUDE.md. Обовʼязковість показує зірочка, правило — дані.
  hint?: string,
  isRequired?: boolean
}>();

// id едет прямо в `field`: кто делает v-bind="field", тот уже связан с подписью.
// Поле, которое ставит себе :id="inputId" из слота, получает связь с подписью:
// клик по ней ставит фокус, читалка экрана называет поле.
const inputId = useId();
</script>

<template>
  <div class="smart-field">
    <Field :name="name" v-slot="vee">
      <span v-if="label" class="smart-field__label">
        <label :for="inputId">
          {{ label }}
          <span v-if="isRequired" class="smart-field__required" aria-hidden="true">*</span>
        </label>

        <!-- Підказка в порталі, поверх сторінки: тіло модалки прокручується й
             обрізало б її біля краю. Відкривається наведенням, фокусом з
             клавіатури й дотиком (фокус); дотик по значку її не закриває. -->
        <TooltipProvider v-if="hint" :delay-duration="150">
          <TooltipRoot disable-closing-trigger>
            <TooltipTrigger as-child>
              <button type="button" class="smart-field__hint" :aria-label="hint">
                <Info :size="12" />
              </button>
            </TooltipTrigger>
            <TooltipPortal>
              <TooltipContent class="smart-field__tip" side="top" :side-offset="6" :collision-padding="8">
                {{ hint }}
              </TooltipContent>
            </TooltipPortal>
          </TooltipRoot>
        </TooltipProvider>
      </span>
      <slot v-bind="vee" :field="{ ...vee.field, id: inputId }" :input-id="inputId"></slot>
      <span class="ui-errors" v-if="vee.errors.length">
        <span class="ui-error" v-for="err in vee.errors" :key="err">
          {{ err }}
        </span>
      </span>
    </Field>
  </div>
</template>

<style lang="scss">
@use "sass:color" as color;

// Глобальные стили полей формы. SmartField — единственная обёртка инпутов,
// поэтому стили инпутов живут здесь (а не в каждой модалке/фильтре).
// Поза .smart-field: радіо й діапазон дат малюють помилки самі, без цієї обгортки.
.ui-errors {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ui-error {
  font-size: 12px;
  line-height: 1.3;
  color: $color-danger;
}

.smart-field {
  display: flex;
  flex-direction: column;
  gap: 6px;

  &__label {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    font-weight: 500;
    color: $color-muted;
  }

  &__required { color: $color-danger; }

  &__hint {
    position: relative;
    display: inline-flex;
    align-items: center;
    padding: 0;
    border: 0;
    background: none;
    color: $color-muted;
    opacity: 0.7;

    &:hover, &:focus-visible { opacity: 1; color: $color-accent; }

    // Показуємо підказку і по наведенню, і по фокусу з клавіатури.
    &[data-state$='open'] { opacity: 1; color: $color-accent; }
  }

  // Портал: над модалкою (999) і поповерами (1000).
  &__tip {
    z-index: 1001;
    max-width: 240px;
    padding: 6px 8px;
    border-radius: 6px;
    background: $color-text;
    color: $color-surface;
    font-size: 11px;
    font-weight: 400;
    line-height: 1.35;
    text-align: left;
    white-space: normal;
  }

  input:not([type='checkbox']):not([type='radio']):not([type='file']),
  select,
  textarea {
    width: 100%;
    padding: 8px 10px;
    border: 1px solid $color-border;
    border-radius: $radius;
    background: $color-surface;
    color: $color-text;
    font-size: 14px;
    font-weight: 400;
    outline: none;

    transition: border-color 120ms ease, box-shadow 120ms ease;

    &:hover:not(:disabled) { border-color: color.adjust($color-border, $lightness: -6%); }

    &:focus {
      border-color: $color-accent;
      box-shadow: 0 0 0 3px $color-accent-dim;
    }

    &:disabled {
      background: $color-page-bg;
      color: $color-muted;
      cursor: not-allowed;
    }
  }

  textarea {
    resize: vertical;
    min-height: 60px;
  }


  // Поле з помилкою — червона рамка (поки помилка присутня у DOM).
  &:has(.ui-errors) {
    input:not([type='checkbox']):not([type='radio']):not([type='file']),
    select,
    textarea {
      border-color: $color-danger;

      &:focus {
        border-color: $color-danger;
        box-shadow: 0 0 0 3px rgba($color-danger, 0.15);
      }
    }
  }
}
</style>
