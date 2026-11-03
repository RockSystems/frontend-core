<script setup lang="ts">
import { Upload, File as FileIcon, X } from '@lucide/vue';
import { ref } from 'vue';
import SmartField from './SmartField.vue';
import { SharedConfig } from '../../../config'

defineProps<{
    label: string,
    name: string,
    accept?: string,
    placeholder?: string
}>();

const labels = SharedConfig.get().labels

const isDragging = ref(false);

const onDragOver = (val: boolean) => isDragging.value = val;
</script>

<template>
    <SmartField
        :name="name"
        :label="label"
        v-slot="{ handleChange, value, inputId }"
    >
        <div
            class="file-field"
            :class="{ 'dragging': isDragging, 'has-file': !!value }"
            @dragover.prevent="onDragOver(true)"
            @dragleave.prevent="onDragOver(false)"
            @drop.prevent="onDragOver(false); handleChange($event.dataTransfer?.files[0])"
        >
            <input
                type="file"
                :id="inputId"
                :accept="accept"
                class="file-field__input"
                @change="(e) => {
                  const input = e.target as HTMLInputElement;
                  handleChange(input.files?.[0]);
                  // Файл уже у формі. Без скидання той самий файл після «Прибрати»
                  // вибрати знову не вийшло б: значення не змінилось — change немає.
                  input.value = '';
                }"
            />

            <label :for="inputId" class="file-field__label">
                <!-- Состояние: Пусто -->
                <span v-if="!value" class="file-field__placeholder">
                    <Upload class="file-field__icon upload" :size="32" />
                    <span class="file-field__text">
                        {{ placeholder || labels.fileDrop }}
                    </span>
                </span>

                <!-- Состояние: Файл выбран -->
                <span v-else class="file-field__preview" @click.prevent>
                    <FileIcon class="file-field__icon file" :size="24" />
                    <span class="file-field__filename">{{ (value as File).name }}</span>
                    <button
                        type="button"
                        class="file-field__reset"
                        @click="handleChange(undefined)"
                        :title="labels.fileRemove"
                    >
                        <X :size="16" />
                    </button>
                </span>
            </label>
        </div>
    </SmartField>
</template>

<style lang="scss" scoped>
.file-field {
    position: relative;
    width: 100%;
    min-height: 120px;
    border: 2px dashed $color-border-strong;
    border-radius: 8px;
    background-color: $color-page-bg;
    transition: all 0.3s ease;

    &.dragging {
        border-color: $color-accent;
        background-color: rgba($color-accent, .05);
    }

    &.has-file {
        border-style: solid;
        border-color: $color-border;
    }

    &__input {
        position: absolute;
        width: 0.1px;
        height: 0.1px;
        opacity: 0;
        overflow: hidden;
        z-index: -1;
    }

    &__input:focus-visible + &__label {
        outline: 2px solid $color-accent;
        outline-offset: 2px;
    }

    &__label {
        display: flex;
        align-items: center;
        justify-content: center;

        width: 100%;
        height: 100%;
        min-height: 116px; // min-height контейнера минус бордеры

        padding: 16px;
        cursor: pointer;
    }

    &__placeholder {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        text-align: center;
    }

    &__preview {
        display: flex;
        align-items: center;
        gap: 10px;

        padding: 8px 12px;

        background: $color-surface;
        border: 1px solid $color-border;
        border-radius: 6px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    }

    &__text {
        color: $color-muted;
        font-size: 14px;
    }

    &__filename {
        max-width: 200px;

        color: $color-text;
        font-size: 14px;

        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    &__icon {
        color: $color-muted;

        &.upload {
            opacity: 0.7;
        }

        &.file {
            color: $color-accent;
        }
    }

    &__reset {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 4px;
        border: none;
        background: transparent;
        color: $color-danger;
        cursor: pointer;
        border-radius: 50%;
        transition: background-color 0.2s;

        &:hover {
            background-color: rgba($color-danger, .1);
        }
    }
}
</style>
