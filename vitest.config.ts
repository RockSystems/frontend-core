import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    // config-timing імпортує пів ядра динамічно: на зайнятій машині 5 секунд за замовчуванням не вистачає.
    testTimeout: 20_000,
  },
})
