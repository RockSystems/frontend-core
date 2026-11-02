// Усе, що проєкту треба від Vite, щоб жити на ядрі. Один виклик замість аліаса й
// optimizeDeps у кожному vite.config: забути щось із цього дорого, dev-сервер падає на старті.
//
// CORE_PATH=../frontend-core npm run dev бере ядро з папки: правки видно одразу, без публікації.

import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const INSTALLED = dirname(fileURLToPath(import.meta.url))

export function frontendCore() {
  return {
    name: 'frontend-core',
    enforce: 'pre',
    config() {
      const root = process.env.CORE_PATH ? resolve(process.env.CORE_PATH) : INSTALLED
      if (!existsSync(join(root, 'src/config.ts'))) {
        throw new Error(`CORE_PATH не вказує на репозиторій ядра: ${root}`)
      }
      const { peerDependencies } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))

      return {
        resolve: {
          alias: [{ find: '@/_shared', replacement: join(root, 'src') }],
          // Ядро з папки інакше брало б vue та інші залежності зі своїх node_modules: дві копії.
          dedupe: Object.keys(peerDependencies),
        },
        // Без цього dev-сервер збирає ядро окремою копією, і SharedConfig.configure()
        // налаштовує не той екземпляр, що читають компоненти.
        optimizeDeps: { exclude: ['@/_shared'] },
        server: { fs: { allow: [process.cwd(), root] } },
      }
    },
  }
}
