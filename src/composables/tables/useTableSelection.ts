import { computed, type Ref, type ModelRef } from 'vue'

export function useTableSelection<Row extends { id: string }>(
    visibleRows: Ref<Row[]>,
    selectedIds: ModelRef<string[] | undefined>
) {
    // Вспомогательное вычисляемое свойство для работы с Set (производительность)
    const selectedSet = computed(() => new Set(selectedIds.value ?? []))

    const isAllSelected = computed(() => {
        return visibleRows.value.length > 0 &&
            visibleRows.value.every(row => selectedSet.value.has(row.id))
    })

    function toggleAll() {
        const visibleIds = visibleRows.value.map(r => r.id)
        const visibleSet = new Set(visibleIds)
        const currentSelected = selectedIds.value ?? []

        if (isAllSelected.value) {
            // Убираем только те, что сейчас видны
            selectedIds.value = currentSelected.filter(id => !visibleSet.has(id))
        } else {
            // Добавляем видимые, исключая дубликаты
            selectedIds.value = [...new Set([...currentSelected, ...visibleIds])]
        }
    }

    function toggleRow(id: string) {
        const currentSelected = selectedIds.value ?? []

        if (selectedSet.value.has(id)) {
            selectedIds.value = currentSelected.filter(currId => currId !== id)
        } else {
            selectedIds.value = [...currentSelected, id]
        }
    }

    return {
        selectedSet,
        isAllSelected,
        toggleAll,
        toggleRow
    }
}
