// Показ помилки мутації чи запиту: ЄДИНЕ місце, де вона стає видимою людині.
// Як саме показати (тост, стор сповіщень, кнопка «Увійти») вирішує проєкт: `SharedConfig.notifyError`.

import axios from 'axios'
import { AppError } from '../api/errors'
import { SharedConfig } from '../config'
import { ActionCancelledError } from './actionCancelled'
import { ApiErrorHelper } from './apiError.helper'

export function handleApiError(error: unknown): void {
  // Скасований запит — не помилка: ми самі обірвали застарілий при зміні фільтра.
  if (axios.isCancel(error)) return
  // Людина закрила діалог, без якого дію не виконати.
  if (error instanceof ActionCancelledError) return

  // Перехоплювач загортає все, що прийшло з мережі, в AppError. Решта — баг нашого коду.
  if (!(error instanceof AppError)) console.error('-- Unhandled error --', error)

  const text = ApiErrorHelper.message(error)
  // Однакова помилка (ретраї, кілька запитів) — один тост, а не стос.
  const codes = error instanceof AppError
    ? (error.problem?.errors ?? []).map(({ code }) => code).sort().join(',')
    : ''

  SharedConfig.get().notifyError(text, {
    id: error instanceof AppError ? `${error.status}:${codes}:${text}` : text,
    isSessionExpired: ApiErrorHelper.isSessionExpired(error),
  })
}

export function useHandleError() {
  return { handleError: handleApiError }
}
