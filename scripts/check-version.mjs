// Для PR: код ядра змінився, отже потрібна нова версія й запис у CHANGES.md.
// Інакше після вливання нічого не опублікується, і проєкти правки не отримають.

import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const base = process.argv[2] ?? 'origin/main'
const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
const sh = command => execSync(command, { encoding: 'utf8' }).trim()

const shipped = sh(`git diff --name-only ${base}...HEAD -- src vite-plugin.js vite-plugin.d.ts`)
if (!shipped) {
  console.log('Код пакета не змінився, нова версія не потрібна.')
  process.exit(0)
}

const before = JSON.parse(sh(`git show ${base}:package.json`)).version
const problems = []
if (pkg.version === before) problems.push(`підніміть version у package.json (зараз ${before})`)
if (!readFileSync('CHANGES.md', 'utf8').includes(`## ${pkg.version}`)) problems.push(`додайте розділ "## ${pkg.version}" у CHANGES.md`)

if (problems.length) {
  console.error(`Код пакета змінився:\n- ${problems.join('\n- ')}`)
  process.exit(1)
}
console.log(`Версія ${before} -> ${pkg.version}, запис у CHANGES.md є.`)
