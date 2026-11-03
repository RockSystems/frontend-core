import {ref, markRaw, Component, shallowRef, InjectionKey, inject, Ref, onScopeDispose} from 'vue';
import { v4 as uuidv4 } from 'uuid';
import {ExtractComponentPublicProps, ExtractModalResult, ModalResult} from "../types/vue-utils";

export interface IActiveModal<TName = any, TRes = any, TProps = any> {
  id: string;
  uid: string;
  isSubmitting: Ref<boolean>;

  name: TName;
  props: TProps;
  component: Component;

  resolve: (val: TRes) => void;
  /** Закрити з волі людини (×, Esc, «Скасувати»): `wait` отримає `undefined`. */
  close: () => void;
  /** Перевірки «є незбережене введене» — їх питає `close()` перед закриттям. */
  dirtyChecks: Set<() => boolean>;
  /** Текст питання й вага перевірки (`useModalDirtyGuard(check, options)`). */
  dirtyOptions: WeakMap<() => boolean, DirtyGuardOptions>;
  /** Поки будь-яка повертає true, вікно не закривається (`useModalCloseBlocker`). */
  closeBlockers: Set<() => boolean>;
  /** Що віддати в `wait`, коли вікно закрили без `resolve` (`setCloseResult`). */
  closeResult: (() => TRes | undefined) | null;
}

export interface DirtyGuardOptions {
  /** Текст питання для `confirmDiscard`; без нього — текст проєкту за замовчуванням. */
  message?: string;
  /** Кілька незбережених станів: питаємо про той, у кого вага вища. За замовчуванням 0. */
  priority?: number;
}

/**
 * Реєстр: кожен ключ — компонент модалки. Не `Record<string, …>`: так реєстром
 * може бути й інтерфейс, який проєкт доповнює declaration merging (а інтерфейс
 * неявного індексного підпису не має).
 */
export type ModalRegistryShape<R> = { [K in keyof R]: Component & ModalResult<any> }

export class ModalsHelper {
  /**
   * Запис реєстру: `reg<boolean>()(Modal)` — тип результату явно, тип компонента
   * виводиться. Не `reg<boolean>(Modal)`: явний перший дженерик вимикав виведення
   * другого, і компонент ставав голим `Component` — пропси в `show()` були `any`.
   * Без результату — `reg(Modal)`.
   */
  static reg<TOrigRes = any>(): <T extends Component>(component: T) => T & ModalResult<TOrigRes>;
  static reg<T extends Component>(component: T): T & ModalResult<any>;
  static reg(component?: Component) {
    return component === undefined
      ? <T extends Component>(target: T) => target as T & ModalResult<unknown>
      : component;
  }

  /**
   * @param options.confirmDiscard — чи можна закрити вікно з незбереженим
   *   введеним (текст питання — справа проєкту). Без нього закривається одразу.
   *   Може повертати Promise — щоб питати власною модалкою, а не window.confirm.
   */
  static createService<R extends ModalRegistryShape<R>>(
    registry: R,
    options: { confirmDiscard?: (message?: string) => boolean | Promise<boolean> } = {},
  ) {
    const confirmDiscard = options.confirmDiscard ?? (() => true);

    // Используем shallowRef, пушто сами объекты модалок не меняются
    const stack = shallowRef<IActiveModal<keyof R>[]>([]);
    function _close(uid: string) {
      stack.value = stack.value.filter(m => m.uid !== uid);
    }

    class ModalContext<K extends keyof R> implements IActiveModal<K, ExtractModalResult<R[K]>, ExtractComponentPublicProps<R[K]>> {
      isSubmitting = ref(false);

      constructor(
        public uid: string,
        public name: K,
        public component: Component,
        public props: ExtractComponentPublicProps<R[K]>,
      ) {
      }

      get id() {
        return `${String(this.name)}-${this.uid}`;
      }

      public onResolve: ((val: any) => void) | null = null;

      dirtyChecks = new Set<() => boolean>();
      dirtyOptions = new WeakMap<() => boolean, DirtyGuardOptions>();
      closeBlockers = new Set<() => boolean>();
      closeResult: (() => any) | null = null;

      // Результат — це вже збережене, тож питати «закрити без збереження?» нема про що.
      resolve(value: any) {
        this.settle(value);
      }

      // Без `undefined` у `wait` той, хто чекає відповіді (підтвердження дубля
      // посеред сабміту), висів би вічно, а його форма — з вічним спінером.
      close(): void | Promise<void> {
        if ([...this.closeBlockers].some(isBlocked => isBlocked())) return;

        // Питаємо про найважливіше незбережене: його текст точніший за загальний.
        const dirty = [...this.dirtyChecks]
          .filter(check => check())
          .map(check => this.dirtyOptions.get(check) ?? {})
          .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

        if (!dirty.length) return this.settle(this.closeResult?.());

        const answer = confirmDiscard(dirty[0].message);
        // Синхронна відповідь (window.confirm) лишається синхронною — як і було.
        if (typeof answer === 'boolean') {
          if (answer) this.settle(this.closeResult?.());
          return;
        }
        return answer.then(ok => {
          if (ok) this.settle(this.closeResult?.());
        });
      }

      private settle(value: any) {
        const onResolve = this.onResolve;

        this.onResolve = null;
        onResolve?.(value);
        _close(this.uid);
      }
    }

    interface ShowResult<K extends keyof R> {
      modal: ModalContext<K>;
      /** `undefined` — вікно закрили без відповіді. */
      wait: Promise<{ [P in K]: ExtractModalResult<R[P]> }[K] | undefined>;
    }

    type ShowConfig<K extends keyof R> = {
      props: ExtractComponentPublicProps<R[K]>;
    };

    type ShowArgs<K extends keyof R> = K extends any
      ? object extends ExtractComponentPublicProps<R[K]> // ПРОВЕРКА НА ОБЯЗАТЕЛЬНЫЕ ПРОПСЫ
        ? [config?: Partial<ShowConfig<K>>]
        : [config: ShowConfig<K>]
      : never;

    // Если пропсов нет, делаем ВЕСЬ конфиг необязательным
    function _show<K extends keyof R = keyof R>(
      name: K,
      ...args: ShowArgs<K>
    ): ShowResult<K> {
      const {props} = args[0] || {};
      const uid = uuidv4();

      const newModal = new ModalContext<K>(
        uid,
        name,
        markRaw(registry[name] as Component),
        (props ?? {}) as ExtractComponentPublicProps<R[K]>,
      );

      return {
        modal: newModal,
        wait: new Promise((resolve) => {
          newModal.onResolve = resolve;
          stack.value = [...stack.value, newModal];
        })
      };
    }

    return {
      stack,
      show: _show
    };
  }

  static createComposable<R extends ModalRegistryShape<R>>(getRegistry: () => R) {
    return {
      useModal: <K extends keyof R = keyof R>(name: K) => {
        getRegistry(); // просто для передали аргумент и для приличия вызвали
        const context = inject(ModalContextKey, null) as IActiveModal<K, ExtractModalResult<R[K]>, ExtractComponentPublicProps<R[K]>> | null;

        if (!context) throw new Error('useModal must be called inside the modal component');
        if (name !== context.name) throw new Error('useModal must be called inside the modal component');

        // Тостів тут немає: `toast` з vue-sonner — глобальний синглтон, його
        // імпортують там, де показують.
        return {
          context,
          uid: context.uid,
          name: context.name,
          props: context.props,
          isSubmitting: context.isSubmitting,
          resolve: context.resolve.bind(context),
          close: context.close.bind(context),
          /** Що віддати в `wait`, коли вікно закрили без `resolve` (пароль уже показано → true). */
          setCloseResult: (result: () => ExtractModalResult<R[K]> | undefined) => {
            context.closeResult = result;
          },
        };
      }
    }
  }
}

export type ModalService<RegistryType extends Record<string, any>> = ReturnType<typeof ModalsHelper.createService<RegistryType>>;
export type UntypedModalService = ModalService<Record<string, any>>;
export const ModalContextKey: InjectionKey<IActiveModal> = Symbol('ModalContext');

/**
 * Усередині модалки, що не знає свого ключа в реєстрі проєкту (модалки ядра:
 * `ConfirmModal`, `ImageViewerModal`).
 */
export function useCurrentModal<TResult = unknown>() {
  const context = inject(ModalContextKey, null) as IActiveModal<string, TResult> | null;

  if (!context) throw new Error('useCurrentModal must be called inside the modal component');

  return {
    resolve: context.resolve.bind(context),
    close: context.close.bind(context),
  };
}

/**
 * «Тут є незбережене» для найближчої модалки: закриття (×, Esc, «Скасувати»)
 * спершу перепитає. Форми `useMyForm` реєструються самі; руками — лише стан
 * поза формою (файли, вибрані рядки). Поза модалкою нічого не робить.
 */
export function useModalDirtyGuard(isDirty: () => boolean, options?: DirtyGuardOptions): void {
  const context = inject(ModalContextKey, null);

  if (!context) return;

  context.dirtyChecks.add(isDirty);
  if (options) context.dirtyOptions.set(isDirty, options);
  onScopeDispose(() => context.dirtyChecks.delete(isDirty));
}

/**
 * Поки `isBlocked()` true, найближча модалка не закривається ні ×, ні Esc,
 * ні «Скасувати» — напр. іде завантаження файлів. Поза модалкою нічого не робить.
 */
export function useModalCloseBlocker(isBlocked: () => boolean): void {
  const context = inject(ModalContextKey, null);

  if (!context) return;

  context.closeBlockers.add(isBlocked);
  onScopeDispose(() => context.closeBlockers.delete(isBlocked));
}
