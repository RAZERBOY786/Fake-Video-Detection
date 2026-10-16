// Verifies that every Tailwind class token used in src/ produces a rule in the
// built CSS (dist/assets/*.css). Run after `npm run build` with: node scripts/check-classes.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(p, out)
    else if (entry.name.endsWith('.jsx')) out.push(p)
  }
  return out
}

const cssDir = path.join(ROOT, 'dist', 'assets')
const cssFile = fs.readdirSync(cssDir).find((f) => f.endsWith('.css'))
if (!cssFile) {
  console.error('no built css found — run `npm run build` first')
  process.exit(1)
}
const css = fs.readFileSync(path.join(cssDir, cssFile), 'utf8')

// marker classes that intentionally produce no CSS rules of their own
const MARKERS = new Set(['group', 'peer', 'dark', 'drop-zone', 'frames-grid'])

// characters that Tailwind escapes in generated selectors
const CSS_ESCAPED = ':/[]().,%!#'
// characters allowed inside a Tailwind class token
const CLASS_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_:/[](),%#!'

function escapeCss(token) {
  return Array.from(token, (c) => (CSS_ESCAPED.includes(c) ? '\\' + c : c)).join('')
}

function looksLikeClassToken(token) {
  return token.length > 0 && Array.from(token).every((c) => CLASS_CHARS.includes(c))
}

const tokens = new Set()
for (const file of walk(path.join(ROOT, 'src'))) {
  const src = fs.readFileSync(file, 'utf8')
  for (const m of src.matchAll(/className="([^"]*)"/g)) {
    for (const t of m[1].split(/\s+/)) if (t) tokens.add(t)
  }
  for (const m of src.matchAll(/'([^']+)'/g)) {
    // class-list string literals in JS (e.g. Layout's ACTIVE/IDLE constants, assigned classNames)
    const s = m[1]
    const parts = s.split(/\s+/)
    if (parts.length < 2 || parts.length > 25) continue
    if (/: |\.|\(|'/.test(s)) continue // prose, not a class list
    if (/[A-Z]/.test(s)) continue // prose (Tailwind utilities and arbitrary values are lowercase)
    if (!parts.every(looksLikeClassToken)) continue
    if (!parts.some((p) => p.includes('-') || p.includes(':'))) continue
    for (const t of parts) tokens.add(t)
  }
}

const missing = []
for (const token of [...tokens].sort()) {
  if (MARKERS.has(token)) continue
  if (!css.includes(escapeCss(token))) missing.push(token)
}

console.log(`checked ${tokens.size} unique class tokens`)
if (missing.length === 0) {
  console.log('all tokens produce CSS rules ✓')
} else {
  console.log(`tokens with NO css rule (${missing.length}):`)
  for (const t of missing) console.log('  ' + t)
}
