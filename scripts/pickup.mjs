// «Поднять сессию» — одна команда в начале нового чата (и после любого пересоздания
// песочницы). Скрипт делает три вещи и в конце печатает, что читать (единый стандарт с «Слово 2.0»).
//
//   1. git: возвращает историю, если клон пересоздали на точке форка (локальный HEAD
//      откатился, а работа уехала в удалённую arena/…-ветку). Никаких --hard: только
//      fetch + reset --mixed, рабочее дерево не трогается.
//   2. зависимости: npm ci, если node_modules стерты (они стираются при пересоздании песочницы).
//   3. контур проверок: typecheck, content:check, test:engine, audit:storage
//      (+ test:smoke, build и test:boot, если не --fast).
//
// Флаги:
//   --git-only   только пункт 1 и состояние (без npm и тестов)
//   --fast       пропустить test:smoke, build и test:boot
//   --no-checks  ничего не запускать, только рассказать состояние
//   --handoff    напечатать черновик «Точка передачи работы в новый чат» по фактам git
//   --push       после починки истории запушить незапушенные коммиты (иначе только подсказка)
//
// Выход: 0 — можно работать; 1 — что-то из контура упало; 2 — история не почищена
// (например, впереди локальные коммиты, которых нет на удалённой ветке).
import { existsSync, readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const argv = process.argv.slice(2)
const flag = (n) => argv.includes('--' + n)
const DEEPEN = Number(process.env.PICKUP_DEEPEN ?? 100)

const run = (cmd, args, opt = {}) =>
  spawnSync(cmd, args, { cwd: root, encoding: 'utf8', maxBuffer: 32 << 20, ...opt })
const git = (args) => run('git', args).stdout?.trim() ?? ''
const ok = (r) => (r.status ?? 1) === 0
const say = (s) => console.log(s)
const head = (s, n = 3) =>
  s
    .split('\n')
    .filter(Boolean)
    .slice(0, n)
    .join(' · ')

const plural = (n, forms) => {
  const k = Math.abs(n) % 100
  const m = k % 10
  return (
    n + ' ' + (k > 10 && k < 20 ? forms[2] : m === 1 ? forms[0] : m > 1 && m < 5 ? forms[1] : forms[2])
  )
}

let failed = false
const step = (name, fn) => {
  const t = Date.now()
  const res = fn()
  const ms = ((Date.now() - t) / 1000).toFixed(1)
  const good = res === true || (res && res.ok)
  if (!good) failed = true
  say(
    `${good ? '✓' : '✗'} ${name.padEnd(42)} ${String(ms).padStart(5)} c${good ? '' : '  ← ' + head(res?.out ?? '', 4)}`
  )
  return res
}

// ── 1. git: чиним историю после пересоздания клона ──────────────────────────
const branch = git(['rev-parse', '--abbrev-ref', 'HEAD'])
const sha = git(['rev-parse', '--short', 'HEAD'])
const isShallow = git(['rev-parse', '--is-shallow-repository']) === 'true'
say(`\nветка ${branch || '(не в git)'} @ ${sha || '?'}${isShallow ? '  [shallow: история короткая]' : ''}`)

let ahead = 0
let behind = 0
const detached = branch === 'HEAD'
if (detached) {
  say('  ! HEAD отделён от ветки (detached) — историю не трогаю, только проверки')
} else if (branch) {
  const fetched = ok(run('git', ['fetch', 'origin', branch]))
  if (!fetched) say('  ! fetch не удалось (нет сети или ветка ещё не на origin) — продолжаю с тем, что есть')
  if (isShallow && fetched) run('git', ['fetch', '--deepen=' + DEEPEN, 'origin', branch])

  const counts = git(['rev-list', '--left-right', '--count', `HEAD...origin/${branch}`])
  if (!counts) {
    say(`  ! origin/${branch} не виден — историю не трогаю, только проверки`)
  } else {
    ;[ahead, behind] = counts.split(/\s+/).map(Number)
    say(`  локально впереди: ${ahead}, отстаёт от удалённой ветки: ${behind}`)
  }

  if (behind > 0 && ahead === 0) {
    const backup = `refs/pickup-backup/${branch}`
    run('git', ['update-ref', backup, git(['rev-parse', 'HEAD'])])
    step(`git reset --mixed origin/${branch} (дерево сохраняется)`, () => {
      const r = run('git', ['reset', `origin/${branch}`])
      return { ok: ok(r), out: r.stderr || r.stdout }
    })
    say(`  страховка на случай промаха: git update-ref ${backup} <старый-sha> → git reset --mixed <sha>`)
  } else if (behind > 0 && ahead > 0) {
    say(
      `  ✗ история и отстаёт, и впереди: на origin ${plural(behind, ['чужой коммит', 'чужих коммита', 'чужих коммитов'])}, у вас ${plural(ahead, ['свой', 'своих', 'своих'])} своих.`
    )
    say('    так reset терпит незапушенное. Разобраться руками: git log --oneline HEAD..origin/' + branch)
    process.exitCode = 2
  }
  if (ahead > 0) {
    if (flag('push'))
      step(`git push origin ${branch}`, () => {
        const r = run('git', ['push', 'origin', branch])
        return { ok: ok(r), out: r.stderr || r.stdout }
      })
    else
      say(
        `  ! ${plural(ahead, ['коммит', 'коммита', 'коммитов'])} ещё не на origin — пушните с разрешения пользователя: git push origin ${branch}`
      )
  }
  const dirty = git(['status', '--porcelain'])
  const deleted = dirty.split('\n').filter((l) => l.startsWith(' D '))
  say(
    `  рабочее дерево: ${dirty ? plural(dirty.split('\n').length, ['изменённый файл', 'изменённых файла', 'изменённых файлов']) : 'чистое'}`
  )
  if (deleted.length) {
    say(
      `    ! ${plural(deleted.length, ['файл', 'файла', 'файлов'])} из восстановленного коммита нет на диске — git checkout -- . их вернёт`
    )
    say('      (сначала проверьте git diff --stat: если это ваши правки, не трите)')
  }
}

if (flag('git-only')) {
  say('\n(--git-only: зависимости и проверки пропущены)')
  process.exit(failed ? 1 : 0)
}

// ── 2. зависимости ──────────────────────────────────────────────────────────
const needCi = !existsSync(path.join(root, 'node_modules/.bin/vite'))
if (needCi)
  step('npm ci (node_modules стерты)', () => {
    const r = run('npm', ['ci'])
    return { ok: ok(r), out: r.stderr || r.stdout }
  })
else say('• node_modules на месте — npm ci не нужен')

const node = process.versions.node
if (Number(node.split('.')[0]) < 22)
  say(`  ! node ${node}, рекомендуется >=22 — тесты могут вести себя иначе`)

// ── 3. контур проверок ──────────────────────────────────────────────────────
say('')
const npm = (script) => () => {
  const r = run('npm', ['run', script])
  return { ok: ok(r), out: (r.stdout || '') + (r.stderr || '') }
}
if (flag('no-checks')) {
  say('• --no-checks: контур проверок пропущен')
} else {
  step('npm run typecheck', npm('typecheck'))
  step('npm run content:check', npm('content:check'))
  step('npm run test:engine', npm('test:engine'))
  step('npm run audit:storage', npm('audit:storage'))

  if (!flag('fast')) {
    step('npm run test:smoke', npm('test:smoke'))
    step('npm run build', npm('build'))
    step('npm run test:boot', npm('test:boot'))
  } else say('• --fast: test:smoke, build и test:boot пропущены')
}

// ── 4. что читать и что показывать ──────────────────────────────────────────
const planPath = path.join(root, 'docs/PLAN.md')
if (existsSync(planPath)) {
  const plan = readFileSync(planPath, 'utf8')
  const marks = [...plan.matchAll(/^### Точка передачи.*$/gm)]
  if (marks.length) {
    const m = marks[marks.length - 1]
    const rest = plan.slice(m.index)
    const nl = rest.indexOf('\n')
    const next = rest.slice(nl + 1).search(/^### /m)
    const text = rest.slice(nl + 1, next < 0 ? rest.length : nl + 1 + next).trimEnd()
    say('\n─ последняя точка передачи (' + m[0].replace(/^### /, '') + ') ─')
    const lines = text.split('\n')
    say(
      lines
        .slice(0, 14)
        .map((l) => '  ' + l)
        .join('\n')
    )
    if (lines.length > 14) {
      const start = plan.slice(0, m.index).split('\n').length
      say(`  … ещё ${plural(lines.length - 14, ['строка', 'строки', 'строк'])} — docs/PLAN.md, с ${start}-й строки`)
    }
  }
}

if (flag('handoff')) {
  const base = git(['merge-base', 'HEAD', 'origin/main']) || 'HEAD~1'
  const commits = git(['log', '--oneline', `${base}..HEAD`])
  const stat = git(['diff', '--stat', base, 'HEAD']).split('\n').slice(-1)[0] ?? ''
  const today = new Date().toISOString().slice(0, 10)
  say('\n─ черновик точки передачи (вставить в docs/PLAN.md, дополнить прозой) ─')
  say(
    [
      `### Точка передачи работы в новый чат — ${today}`,
      '',
      `* **Ветка:** \`${branch}\` (от \`main\` \`${git(['rev-parse', '--short', 'origin/main'])}\`).`,
      `  В ветке — ${plural(commits.split('\n').filter(Boolean).length, ['коммит', 'коммита', 'коммитов'])}: ${commits
        .split('\n')
        .map((l) => l.trim())
        .join('; ')}.`,
      `  Итог по файлам: ${stat.trim()}.`,
      `* **PR:** ${branch} → main (\`gh pr view --json state,mergeable\`).`,
      '* **Что проверять после правок:** `npm run pickup` (он же чинит историю и',
      '  ставит зависимости после пересоздания песочницы); то же самое руками:',
      '  `typecheck`, `content:check`, `test:engine`, `test:smoke`, `audit:storage`, `build`, `test:boot`.',
      '* **Открытые задачи по приоритету:** …',
      '* **Грабли песочницы (по-прежнему):** клон пересоздаётся на точке форка,',
      '  `node_modules` стираются — первый шаг новой сессии `npm run pickup`.'
    ].join('\n')
  )
}

say('\n' + (failed ? '✗ есть падения — см. строки выше' : '✓ сессия поднята, можно работать'))
if (failed) process.exit(1)
