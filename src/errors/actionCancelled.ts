// Дію скасувала людина (закрила діалог, без якого її не виконати). Це не помилка:
// `useHandleError` і `useAppForm` мовчки її пропускають.

export class ActionCancelledError extends Error {
  constructor() {
    super('Action cancelled by the user.')
    this.name = 'ActionCancelledError'
  }
}
