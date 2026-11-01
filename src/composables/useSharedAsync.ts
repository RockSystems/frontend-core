import { ref, type Ref } from 'vue';
import { handleApiError } from '../errors/useHandleError'
import {MyFunction} from "../types/common";

// Глобальное хранилище состояний для каждой функции
interface AsyncState {
    isLoading: Ref<boolean>;
    activePromise: Promise<any> | null;
}

const registry = new WeakMap<MyFunction, AsyncState>();

export function useSharedAsync<T, Args extends any[]>(
    asyncFn: (...args: Args) => Promise<T>
) {
    // Есть ли уже состояние для этой функции
    if (!registry.has(asyncFn)) {
        registry.set(asyncFn, {
            isLoading: ref(false),
            activePromise: null
        });
    }

    // Не null, сверху добавили
    const state = registry.get(asyncFn)!;

    const handle = async (...args: Args): Promise<T | undefined> => {
        // Если запрос уже выполняется - возвращаем существующий Promise
        if (state.activePromise) return state.activePromise

        state.isLoading.value = true;

        // Создаем запрос и сохраняем его в стейт
        state.activePromise = asyncFn(...args)
            .catch((error) => {
                handleApiError(error);
                return undefined;
            })
            .finally(() => {
                state.isLoading.value = false;
                state.activePromise = null; // Очищаем после завершения
            });

        return state.activePromise;
    };

    return {
        isLoading: state.isLoading,
        handle
    };
}
