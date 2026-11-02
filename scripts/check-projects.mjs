// Ставить поточне ядро в чисті копії проєктів і перевіряє, що нічого не зламалось.
//
//   npm run check:projects            усі проєкти
//   npm run check:projects -- tir     лише один
//
// Локально клонує з вашим доступом до GitHub, у CI бере PROJECTS_READ_TOKEN.
// Посилання Wayfinder генеруються PHP і в git їх немає, тому без них перевіряються лише типи:
// повну збірку таких проєктів показує їхній власний PR.

import { spawnSync } from 'node:child_process'
import { appendFileSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const TOKEN = process.env.PROJECTS_READ_TOKEN ?? ''
const projects = JSON.parse(readFileSync(join(import.meta.dirname, 'projects.json'), 'utf8'))
const only = process.argv.slice(2)
const hide = text => (TOKEN ? text.replaceAll(TOKEN, '***') : text)

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', shell: process.platform === 'win32', maxBuffer: 64 * 1024 * 1024 })
  const output = hide(`${result.stdout ?? ''}${result.stderr ?? ''}`).replace(/\x1b\[[0-9;]*[mA-Z]/g, '')

  return { ok: result.status === 0, output }
}

const tail = (text, lines = 15) => text.trim().split('\n').slice(-lines).join('\n')

function typeErrors(output, generated) {
  // Модулі, яких немає без PHP. Їхні імена лишаються в повідомленні, решта помилок справжні.
  const absent = generated.length ? new RegExp(`'@/(${generated.join('|')})[/']`) : null

  return output
    .split('\n')
    .filter(line => line.includes('error TS'))
    .filter(line => !(absent && line.includes('TS2307') && absent.test(line)))
}

function checkProject(project, tarball, work) {
  const dir = join(work, project.name)
  const host = TOKEN ? `x-access-token:${TOKEN}@github.com` : 'github.com'
  const clone = run('git', ['clone', '--quiet', '--depth', '1', '--branch', project.branch, `https://${host}/${project.repo}.git`, dir], work)
  if (!clone.ok) return [`не вдалося клонувати:\n${tail(clone.output, 3)}`]

  const app = join(dir, project.dir)
  const problems = []

  // Копія ядра в проєкті розходиться з пакетом: так уже втрачали правки.
  if (existsSync(join(app, project.sources, '_shared'))) problems.push(`у проєкті знову є ${project.sources}/_shared`)

  const vite = readFileSync(join(app, 'vite.config.ts'), 'utf8')
  if (!vite.includes('frontendCore(') && !vite.includes("exclude: ['@/_shared']")) problems.push('у vite.config немає frontendCore()')

  const ci = run('npm', ['ci', '--no-audit', '--no-fund'], app)
  if (!ci.ok) return [...problems, `npm ci:\n${tail(ci.output)}`]

  const install = run('npm', ['install', tarball, '--no-save', '--no-audit', '--no-fund'], app)
  if (!install.ok) return [...problems, `встановлення ядра:\n${tail(install.output)}`]

  const types = run('npx', ['vue-tsc', '--noEmit', '-p', project.tsconfig], app)
  const errors = typeErrors(types.output, project.generated)
  if (errors.length) problems.push(`типи, помилок ${errors.length}:\n${errors.slice(0, 15).join('\n')}`)
  else if (!types.ok && !types.output.includes('error TS')) problems.push(`vue-tsc:\n${tail(types.output)}`)

  if (project.build) {
    const build = run('npx', ['vite', 'build'], app)
    if (!build.ok) problems.push(`збірка:\n${tail(build.output)}`)
  }
  if (project.test) {
    const test = run('npm', ['run', '-s', project.test], app)
    if (!test.ok) problems.push(`тести:\n${tail(test.output)}`)
  }

  return problems
}

const work = mkdtempSync(join(tmpdir(), 'core-check-'))
const pack = run('npm', ['pack', '--silent', '--pack-destination', work], ROOT)
const tarballName = readdirSync(work).find(name => name.endsWith('.tgz'))
if (!pack.ok || !tarballName) {
  console.error(`npm pack:\n${tail(pack.output)}`)
  process.exit(1)
}

const summary = []
for (const project of projects.filter(item => !only.length || only.includes(item.name))) {
  console.log(`--- ${project.name}`)
  const problems = checkProject(project, join(work, tarballName), work)
  summary.push({ name: project.name, problems })
  console.log(problems.length ? problems.join('\n\n') : 'ок')
}

try {
  rmSync(work, { recursive: true, force: true, maxRetries: 3 })
}
catch {
  // На Windows тимчасову папку може тримати антивірус: на результат це не впливає.
}

const failed = summary.filter(item => item.problems.length)
const report = summary.map(item => `- ${item.problems.length ? '❌' : '✅'} ${item.name}`).join('\n')
console.log(`\n${report}`)
if (process.env.GITHUB_STEP_SUMMARY) {
  const major = 'Для мажорної версії червоне очікуване: це і є список того, що зробити в проєктах.'
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Ядро в проєктах\n\n${report}\n\n${failed.length ? `${major}\n` : ''}`)
}
process.exit(failed.length ? 1 : 0)
