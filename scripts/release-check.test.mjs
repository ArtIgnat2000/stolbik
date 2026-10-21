import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { validateRelease } from './release-check.mjs'

const valid = {
  baseVersion: '0.1.0',
  version: '0.2.0',
  lockVersion: '0.2.0',
  rootVersion: '0.2.0',
  hasNote: true,
  title: 'v0.2.0 — общие практики с Слово 2.0'
}

test('patch, minor и major увеличения допустимы; сравнение числовое', () => {
  for (const version of ['0.1.1', '0.1.10', '0.2.0', '1.0.0']) {
    assert.doesNotThrow(() =>
      validateRelease({
        ...valid,
        version,
        lockVersion: version,
        rootVersion: version,
        title: `v${version} — релиз`
      })
    )
  }
})

test('та же или меньшая версия отклоняется, даже для docs-only PR', () => {
  for (const version of ['0.1.0', '0.0.9']) {
    assert.throws(() => validateRelease({ ...valid, version }), /увеличивать версию/)
  }
})

test('некорректные, prerelease и нестроковые версии отклоняются', () => {
  for (const version of ['0.2', '00.2.0', '0.2.0-beta', '0.2.0+build', 'x', null, 8]) {
    assert.throws(() => validateRelease({ ...valid, version }), /стабильная версия/)
    assert.throws(() => validateRelease({ ...valid, baseVersion: version }), /стабильная версия/)
  }
})

test('оба поля lock обязаны совпадать', () => {
  assert.throws(() => validateRelease({ ...valid, lockVersion: '0.1.0' }), /package-lock/)
  assert.throws(() => validateRelease({ ...valid, rootVersion: '0.1.0' }), /package-lock/)
  assert.throws(() => validateRelease({ ...valid, rootVersion: undefined }), /package-lock/)
})

test('заметка и соответствующий версии заголовок обязательны в CI', () => {
  assert.throws(() => validateRelease({ ...valid, hasNote: false }), /Нет релизной/)
  for (const title of ['', 'docs: изменение', 'v0.1.0 — релиз', 'v0.2.00 — релиз']) {
    assert.throws(() => validateRelease({ ...valid, title }), /Заголовок PR/)
  }
  assert.doesNotThrow(() => validateRelease({ ...valid, title: undefined }))
})

test('CLI читает git base, JSON, заметку и PR_TITLE; ошибки дают ненулевой exit code', () => {
  const dir = mkdtempSync(join(process.cwd(), '.release-test-'))
  const script = fileURLToPath(new URL('./release-check.mjs', import.meta.url))
  const write = (name, value) => writeFileSync(join(dir, name), JSON.stringify(value))
  const run = (ref = 'HEAD') =>
    spawnSync(process.execPath, [script, ref], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, PR_TITLE: valid.title }
    })
  try {
    execFileSync('git', ['init', '--quiet'], { cwd: dir })
    write('package.json', { version: valid.baseVersion })
    execFileSync('git', ['add', 'package.json'], { cwd: dir })
    execFileSync(
      'git',
      ['-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '--quiet', '-m', 'base'],
      { cwd: dir }
    )
    write('package.json', { version: valid.version })
    write('package-lock.json', { version: valid.lockVersion, packages: { '': { version: valid.rootVersion } } })
    mkdirSync(join(dir, 'docs'))
    writeFileSync(join(dir, 'docs/RELEASE-0.2.0.md'), '# Релиз 0.2.0')
    assert.equal(run().status, 0)
    write('package.json', { version: valid.baseVersion })
    assert.equal(run().status, 1)
    assert.match(run().stderr, /увеличивать версию/)
    assert.equal(run('missing-ref').status, 1)
    writeFileSync(join(dir, 'package.json'), '{')
    assert.equal(run().status, 1)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
