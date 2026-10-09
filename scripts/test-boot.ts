import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { JSDOM } from 'jsdom'

const buildDirectory = resolve(process.cwd(), 'dist')
const htmlPath = resolve(buildDirectory, 'index.html')
if (!existsSync(htmlPath)) throw new Error('Прод-сборка не создала dist/index.html. Сначала выполните npm run build.')

const html = readFileSync(htmlPath, 'utf8')
const dom = new JSDOM(html)
if (!dom.window.document.querySelector('#root')) throw new Error('В стартовой странице отсутствует корневой контейнер #root.')

const scriptPaths = [...html.matchAll(/<script[^>]+src="([^"]+\.js)"/g)].map((match) => match[1]!)
if (scriptPaths.length === 0) throw new Error('В index.html не найден стартовый JavaScript-бандл.')
for (const scriptPath of scriptPaths) {
  const normalized = scriptPath.replace(/^\//, '')
  const assetStart = normalized.indexOf('assets/')
  const assetPath = assetStart >= 0 ? normalized.slice(assetStart) : normalized
  const absolutePath = resolve(buildDirectory, assetPath)
  if (!existsSync(absolutePath)) throw new Error(`Не найден JS-файл стартового бандла: ${scriptPath}`)
  const bundle = readFileSync(absolutePath, 'utf8')
  if (bundle.length < 10_000) throw new Error(`Стартовый JS подозрительно мал (${bundle.length} байт): ${scriptPath}`)
  if (bundle.length > 200_000) throw new Error(`Стартовый JS превышает лимит 200 КБ (${bundle.length} байт): ${scriptPath}`)
  if (!bundle.includes('СТОЛБИК')) throw new Error('В стартовом бандле не найдены тексты приложения.')
}

const files = readdirSync(buildDirectory)
if (!files.includes('manifest.webmanifest')) throw new Error('PWA manifest не попал в прод-сборку.')
if (!files.includes('sw.js')) throw new Error('Service worker не попал в прод-сборку.')
console.log('Проверено: стартовая HTML-оболочка, JS-бандл, PWA manifest и service worker на месте.')
