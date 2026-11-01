// Підтвердження дії модалкою: `if (!(await confirm({ … }))) return`.
// Закрили хрестиком чи Esc — це «ні», а не undefined.

import type { ModalService } from '../plugins/modals.plugin'

export interface ConfirmOptions {
  /** Питання: «Видалити платіж?» */
  title: string
  /** Наслідки, якщо вони неочевидні. Абзаци — через порожній рядок. */
  text?: string
  /** Слово дії на кнопці: «Видалити», «Зняти». За замовчуванням «Так». */
  confirmText?: string
  /** Незворотна дія — червона кнопка. */
  isDanger?: boolean
}

/** Сервіс модалок дає проєкт: у кого він через inject, у кого модулем. Ключ `confirm` у реєстрі — ConfirmModal. */
export function useConfirm(modals: ModalService<any>) {
  return async (options: ConfirmOptions): Promise<boolean> =>
    (await modals.show('confirm', { props: options }).wait) === true
}
