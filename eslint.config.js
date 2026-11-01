import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import pluginVue from 'eslint-plugin-vue'

export default defineConfigWithVueTs(
  { ignores: ['node_modules/**'] },
  pluginVue.configs['flat/essential'],
  vueTsConfigs.recommended,
  {
    rules: {
      'vue/multi-word-component-names': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-empty-object-type': 'off',
    },
  },
  {
    // `@/` у кожному проєкті веде в інше місце, тож усередині ядра лише відносні імпорти.
    files: ['src/**'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          group: ['@/*', '**/shared/**', '**/entities/**', '**/features/**', '**/pages/**', '**/app/**', '**/layouts/**'],
          message: 'Ядро не знає проєктів: лише відносні імпорти всередині ядра й пакети. Потрібне від проєкту передається через SharedConfig.',
        }],
      }],
    },
  },
)
