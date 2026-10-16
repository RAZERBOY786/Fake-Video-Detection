// Smoke-renders the page and the layout chrome with react-dom/server via Vite's SSR
// module loader. Fails on runtime errors or React DOM-prop warnings.
// Run with: node scripts/ssr-check.mjs
import { createServer } from 'vite'
import { renderToString } from 'react-dom/server'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'

const PAGES = {
  VideoAnalysis: [
    'Deepfake Video Detection',
    'MobileNetV2',
    'Initialize Deep Neural Scan',
    'Decision rule',
  ],
  ModelArchitecture: [
    'Model Architecture',
    'MobileNetV2',
    'multi_head_attention',
    'Trainable parameters',
  ],
  Reports: ['Forensic Video Audit', 'Forensic Reports', 'Loading evidence vault'],
  Benchmarks: ['Dataset Benchmarks', 'Empirical Benchmark Evaluation', 'Loading benchmark report'],
}

const CHROME = ['AegisScan', 'Deepfake Detection System', 'MobileNetV2', 'Bidirectional LSTM']

const SPLASH = ['AegisScan', 'NEURAL FORENSICS', 'Neural inference core', 'Forensic Integrity Suite']

const server = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
})

let ok = true

for (const [name, probes] of Object.entries(PAGES)) {
  try {
    const mod = await server.ssrLoadModule(`/src/pages/${name}.jsx`)
    // Wrap every page in a MemoryRouter so pages that use <Link>/NavLink can
    // render (the app mounts its routes under BrowserRouter at runtime).
    const html = renderToString(
      React.createElement(MemoryRouter, null, React.createElement(mod.default)),
    )
    const missing = probes.filter((s) => !html.includes(s))
    if (missing.length) ok = false
    console.log(
      `${name}: rendered ${html.length} chars ${missing.length ? 'MISSING: ' + missing.join(', ') : 'OK'}`,
    )
  } catch (error) {
    ok = false
    console.error(`${name}: FAILED\n`, error)
  }
}

try {
  const layout = await server.ssrLoadModule('/src/components/Layout.jsx')
  const html = renderToString(
    React.createElement(MemoryRouter, null, React.createElement(layout.default)),
  )
  const missing = CHROME.filter((s) => !html.includes(s))
  if (missing.length) ok = false
  console.log(
    `Layout: rendered ${html.length} chars ${missing.length ? 'MISSING: ' + missing.join(', ') : 'OK'}`,
  )
} catch (error) {
  ok = false
  console.error('Layout: FAILED\n', error)
}

try {
  const splash = await server.ssrLoadModule('/src/components/SplashScreen.jsx')
  const html = renderToString(React.createElement(splash.default))
  const missing = SPLASH.filter((s) => !html.includes(s))
  if (missing.length) ok = false
  console.log(
    `SplashScreen: rendered ${html.length} chars ${missing.length ? 'MISSING: ' + missing.join(', ') : 'OK'}`,
  )
} catch (error) {
  ok = false
  console.error('SplashScreen: FAILED\n', error)
}

await server.close()
process.exit(ok ? 0 : 1)
