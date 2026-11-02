import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import * as sass from 'sass'
import { describe, expect, it } from 'vitest'

// Ядро ходить у кілька проєктів і не знає ні їхньої мови, ні кольорів, ні структури:
// усе проєктне приходить через SharedConfig і токени `additionalData`.

const ROOT = resolve(import.meta.dirname, '../..')
const SRC = join(ROOT, 'src')

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    return entry.isDirectory() ? walk(path) : [path]
  })
}

const files = walk(SRC)
const sources = files
  .filter(file => /\.(ts|vue)$/.test(file))
  .map(file => ({ file, name: relative(ROOT, file).replaceAll('\\', '/'), text: readFileSync(file, 'utf8').replaceAll('\r\n', '\n') }))

/** Текст без коментарів; рядки зберігають номери, щоб показати, де саме. */
function withoutComments(source: string): string {
  const blank = (match: string) => match.replace(/[^\n]/g, ' ')
  return source
    .replace(/<!--[\s\S]*?-->/g, blank)
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/(^|[^:'"`\\])\/\/[^\n]*/g, (match, before: string) => before + blank(match.slice(before.length)))
}

function styleBlocks(text: string): string[] {
  return [...text.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(match => match[1])
}

const styles = [
  ...sources.filter(({ file }) => file.endsWith('.vue')).flatMap(({ name, text }) => styleBlocks(text).map(css => ({ name, css }))),
  ...files.filter(file => file.endsWith('.scss')).map(file => ({ name: relative(ROOT, file).replaceAll('\\', '/'), css: readFileSync(file, 'utf8') })),
]

function importsOf(text: string): string[] {
  return [...text.matchAll(/(?:^|\s)(?:import|export)\s[^'"\n]*?from\s+['"]([^'"]+)['"]|(?:^|\s)import\s+['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/gm)]
    .map(match => match[1] ?? match[2] ?? match[3])
}

describe('core boundaries', () => {
  it('has sources to check', () => {
    expect(sources.length).toBeGreaterThan(50)
    expect(styles.length).toBeGreaterThan(10)
  })

  it('holds no UI text: labels come from SharedConfig', () => {
    const offenders = sources.flatMap(({ name, text }) =>
      withoutComments(text.replace(/<style[^>]*>[\s\S]*?<\/style>/g, ''))
        .split('\n')
        .flatMap((line, index) => (/[Ѐ-ӿ]/.test(line) ? [`${name}:${index + 1}  ${line.trim()}`] : [])),
    )

    expect(offenders, 'Перенесіть текст у SharedConfig.labels (src/config.ts)').toEqual([])
  })

  it('imports only itself by relative path and declared peer dependencies', () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as { peerDependencies: Record<string, string> }
    const packageOf = (id: string) => id.split('/').slice(0, id.startsWith('@') ? 2 : 1).join('/')

    const offenders = sources.flatMap(({ file, name, text }) =>
      importsOf(withoutComments(text)).flatMap((id) => {
        if (id.startsWith('.')) {
          return relative(SRC, resolve(dirname(file), id)).startsWith('..') ? [`${name}: виходить за межі ядра: ${id}`] : []
        }
        if (id.startsWith('@/')) return [`${name}: аліас проєкту: ${id}`]

        return packageOf(id) in pkg.peerDependencies ? [] : [`${name}: не в peerDependencies: ${id}`]
      }),
    )

    expect(offenders).toEqual([])
  })

  it('table components bring their column types along', () => {
    // Інакше типи є лише там, де проєкт сам додав table.d.ts у tsconfig, а `exclude: node_modules` його відкидає.
    const offenders = sources
      .filter(({ text }) => /columnDef\.meta|\.meta\?\.(align|hint|emphasis)/.test(text))
      .filter(({ text }) => !text.includes("from '../../types/table'"))
      .map(({ name }) => name)

    expect(offenders).toEqual([])
  })

  it('paints only with project tokens', () => {
    // Дозволені лише нейтральні тіні, затемнення під модалкою й білий значок на залитій кнопці
    // чи на темному тлі переглядача зображень.
    const allowed = /^rgba\((0, 0, 0|15, 20, 30), [\d.]+\)$/
    const whiteAllowed = ['src/components/ui/UiIconButton.vue', 'src/components/modals/ImageViewerModal.vue']

    const offenders = styles.flatMap(({ name, css }) =>
      [...withoutComments(css).matchAll(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)$]*\)/g)]
        .map(match => match[0])
        .filter(literal => !allowed.test(literal) && !(whiteAllowed.includes(name) && literal === '#fff'))
        .map(literal => `${name}: ${literal}`),
    )

    expect(offenders, 'Колір задає проєкт: візьміть токен із контракту (README)').toEqual([])
  })

  it('compiles every style with nothing but the token contract', () => {
    const failures = styles.flatMap(({ name, css }) => {
      try {
        sass.compileString(`@use "tokens" as *;\n${css}`, {
          loadPaths: [join(ROOT, 'tests/fixtures')],
          logger: sass.Logger.silent,
        })

        return []
      }
      catch (error) {
        return [`${name}: ${(error as Error).message.split('\n')[0]}`]
      }
    })

    expect(failures, 'Стиль бере те, чого немає в контракті: tests/fixtures/_tokens.scss').toEqual([])
  })
})
