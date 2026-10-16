// Verifies that src/index.css reproduces the reference Tailwind config from Q
// (colours, radius, spacing, font families and font sizes) value for value.
// Run with: node scripts/check-theme.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const qFile = path.join(ROOT, 'Q', 'neural_deepfake_video_detection_forensics_studio', 'code.html')

const html = fs.readFileSync(qFile, 'utf8')
const start = html.indexOf('tailwind.config = ')
const end = html.indexOf('</script>', start)
const configLiteral = html.slice(start + 'tailwind.config = '.length, end).trim().replace(/;$/, '')
// eslint-disable-next-line no-new-func
const config = new Function(`return (${configLiteral})`)().theme.extend

const css = fs.readFileSync(path.join(ROOT, 'src', 'index.css'), 'utf8')

const problems = []
const check = (label, expected) => {
  const found = css.includes(expected)
  if (!found) problems.push(`${label}: missing \`${expected}\``)
  return found
}

// ---- colours
for (const [name, value] of Object.entries(config.colors)) {
  check(`colour ${name}`, `--color-${name}: ${value};`)
}

// ---- radius (Tailwind v3 names -> v4 variables)
const radiusMap = { DEFAULT: '--radius', lg: '--radius-lg', xl: '--radius-xl', full: '--radius-full' }
for (const [name, value] of Object.entries(config.borderRadius)) {
  const variable = radiusMap[name]
  if (!variable) problems.push(`radius ${name}: unmapped v3 key`)
  else check(`radius ${name}`, `${variable}: ${value};`)
}

// ---- spacing
for (const [name, value] of Object.entries(config.spacing)) {
  check(`spacing ${name}`, `--spacing-${name}: ${value};`)
}

// ---- font families
for (const [name, families] of Object.entries(config.fontFamily)) {
  const [family] = families
  const re = new RegExp(`--font-${name}:\\s*["']?${family}`)
  if (!re.test(css)) problems.push(`font ${name}: missing ${family} for --font-${name}`)
}

// ---- font sizes (+ line height, letter spacing, weight)
for (const [name, spec] of Object.entries(config.fontSize)) {
  const [size, options = {}] = spec
  check(`fontSize ${name} size`, `--text-${name}: ${size};`)
  if (options.lineHeight) check(`fontSize ${name} line-height`, `--text-${name}--line-height: ${options.lineHeight};`)
  if (options.letterSpacing) check(`fontSize ${name} letter-spacing`, `--text-${name}--letter-spacing: ${options.letterSpacing};`)
  if (options.fontWeight) check(`fontSize ${name} weight`, `--text-${name}--font-weight: ${options.fontWeight};`)
}

const totals =
  Object.keys(config.colors).length +
  Object.keys(config.borderRadius).length +
  Object.keys(config.spacing).length +
  Object.keys(config.fontFamily).length +
  Object.keys(config.fontSize).length

if (problems.length === 0) {
  console.log(`theme matches the reference config (${totals} token groups) OK`)
} else {
  console.log(`theme mismatches (${problems.length}):`)
  for (const p of problems) console.log('  ' + p)
  process.exit(1)
}
