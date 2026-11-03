#!/usr/bin/env node
// Dependency-free release checks for BrickStep 3D Pro.
//
//   node scripts/check.mjs
//
// Exit 0 with "OK <n> checks" when everything passes; exit 1 and list failures
// otherwise. This is a static check: it does not launch a browser or WebGL.

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, extname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SKILL_ID = 'brickstep-3d-pro'
const failures = []
let checks = 0

function record(name, fn) {
  checks++
  try {
    const result = fn()
    if (result === false) throw new Error('returned false')
  } catch (error) {
    failures.push(`${name}: ${error && error.message ? error.message : String(error)}`)
  }
}

function mustExist(relPath) {
  record(`file exists: ${relPath}`, () => {
    if (!existsSync(join(ROOT, relPath))) throw new Error('missing')
  })
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue
    const path = join(dir, entry.name)
    if (entry.isDirectory()) walk(path, out)
    else if (entry.isFile()) out.push(path)
  }
  return out
}

function isExternal(target) {
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(target)
}

function stripFences(text) {
  return text.replace(/```[\s\S]*?```/g, '').replace(/~~~[\s\S]*?~~~/g, '')
}

function checkLocalReference(sourceFile, rawTarget) {
  let target = rawTarget.trim().replace(/^<|>$/g, '')
  if (!target || isExternal(target)) return
  const hashIndex = target.indexOf('#')
  if (hashIndex >= 0) target = target.slice(0, hashIndex)
  if (!target) return
  try {
    target = decodeURIComponent(target)
  } catch {
    // Keep the raw string; a malformed escape will simply fail to resolve.
  }
  const base = target.startsWith('/') ? ROOT : dirname(join(ROOT, sourceFile))
  const resolved = target.startsWith('/')
    ? join(ROOT, target.slice(1))
    : resolve(base, target)
  if (!resolved.startsWith(ROOT + sep) && resolved !== ROOT) {
    throw new Error(`points outside the repository: ${rawTarget}`)
  }
  if (!existsSync(resolved)) throw new Error(`missing target: ${rawTarget}`)
}

/* 1. Required release files. */
const required = [
  'index.html',
  'style.css',
  'script.js',
  'README.md',
  'AGENTS.md',
  'docs/ARCHITECTURE.md',
  'docs/REPRODUCTION.md',
  'docs/DEPLOYMENT.md',
  'docs/TESTING.md',
  'scripts/check.mjs',
  `skills/${SKILL_ID}/SKILL.md`,
  `skills/${SKILL_ID}/ATTRIBUTION.md`,
  `skills/${SKILL_ID}/references/method.md`,
  `skills/${SKILL_ID}/references/lessons.md`,
  `skills/${SKILL_ID}/references/verification.md`,
  `skills/${SKILL_ID}/assets/template/index.html`,
  `skills/${SKILL_ID}/assets/template/style.css`,
  `skills/${SKILL_ID}/assets/template/script.js`
]
required.forEach(mustExist)

/* 2. Template files must be byte-identical to the released sources. */
for (const file of ['index.html', 'style.css', 'script.js']) {
  record(`template matches source: ${file}`, () => {
    const source = readFileSync(join(ROOT, file))
    const template = readFileSync(join(ROOT, 'skills', SKILL_ID, 'assets', 'template', file))
    if (!source.equals(template)) throw new Error('template copy differs')
  })
}

/* 3. Every local src/href in index.html resolves. */
record('index.html local src/href targets', () => {
  const html = readFileSync(join(ROOT, 'index.html'), 'utf8')
  const re = /\b(?:src|href)\s*=\s*(["'])([^"']+)\1/gi
  let match
  let found = 0
  while ((match = re.exec(html))) {
    const target = match[2]
    if (isExternal(target)) continue
    found++
    try {
      checkLocalReference('index.html', target)
    } catch (error) {
      throw new Error(`${target} (${error.message})`)
    }
  }
  if (!found) throw new Error('no local references found')
})

/* 4. Relative Markdown links in README, AGENTS and docs resolve. */
const mdFiles = ['README.md', 'AGENTS.md']
for (const file of walk(join(ROOT, 'docs'))) {
  if (extname(file) === '.md') mdFiles.push(relative(ROOT, file).split(sep).join('/'))
}
record('relative Markdown links', () => {
  let found = 0
  for (const file of mdFiles) {
    const text = stripFences(readFileSync(join(ROOT, file), 'utf8'))
    const re = /!?\[[^\]]*\]\(\s*([^)\s]+)(?:\s+["'][^"']*["'])?\s*\)/g
    let match
    while ((match = re.exec(text))) {
      const target = match[1]
      if (isExternal(target)) continue
      found++
      try {
        checkLocalReference(file, target)
      } catch (error) {
        throw new Error(`${file} → ${target} (${error.message})`)
      }
    }
  }
  if (!found) throw new Error('no relative links found')
})

/* 5. Every JavaScript file parses. */
const jsFiles = walk(ROOT).filter((file) => extname(file) === '.js')
record('JavaScript syntax', () => {
  if (!jsFiles.length) throw new Error('no .js files found')
  for (const file of jsFiles) {
    try {
      execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' })
    } catch (error) {
      const detail = error.stderr ? String(error.stderr).trim() : error.message
      throw new Error(`${relative(ROOT, file)}: ${detail}`)
    }
  }
})

/* 6. Every JSON file parses. */
const jsonFiles = walk(ROOT).filter((file) => extname(file) === '.json')
record('JSON parsing', () => {
  if (!jsonFiles.length) throw new Error('no .json files found')
  for (const file of jsonFiles) {
    try {
      JSON.parse(readFileSync(file, 'utf8').replace(/^\uFEFF/, ''))
    } catch (error) {
      throw new Error(`${relative(ROOT, file)}: ${error.message}`)
    }
  }
})

/* Report. */
if (failures.length) {
  for (const failure of failures) console.error(`FAIL ${failure}`)
  console.error(`\n${failures.length} failed, ${checks - failures.length} passed`)
  process.exit(1)
}

console.log(`OK ${checks} checks`)
