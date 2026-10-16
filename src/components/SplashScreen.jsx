import { useEffect, useState } from 'react'
import GhostFibers from './GhostFibers.jsx'
import { FIBER_PROPS } from '../lib/fiberTheme.js'

// The splash holds for 3 seconds, then fades out. FADE_MS must match the
// `duration-700` opacity transition used on the overlay below.
const HOLD_MS = 3000
const FADE_MS = 700

// Cosmetic boot log shown while the splash is on screen. `at` is the loading
// percentage at which the line flips from pending to done.
const BOOT_LINES = [
  { label: 'Loading spatio-temporal model weights', at: 18 },
  { label: 'Warming MobileNetV2 feature extractor', at: 52 },
  { label: 'Arming forensic evidence vault', at: 84 },
]

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

export default function SplashScreen() {
  // active -> leaving (fading out) -> done (unmounted)
  const [phase, setPhase] = useState('active')
  const [progress, setProgress] = useState(() => (prefersReducedMotion() ? 100 : 0))

  useEffect(() => {
    // Freeze background scrolling while the splash owns the screen.
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const holdTimer = setTimeout(() => setPhase('leaving'), HOLD_MS)
    const doneTimer = setTimeout(() => {
      // The component stays mounted (App keeps rendering it) after the splash
      // finishes, so the cleanup below only fires on real unmount. Restore the
      // scroll lock here too, otherwise the page can never scroll again.
      document.body.style.overflow = previousOverflow
      setPhase('done')
    }, HOLD_MS + FADE_MS)

    // Drive the percentage readout from the same 3s window. With
    // reduced-motion the initial state already reads 100%.
    let frame = 0
    if (!prefersReducedMotion()) {
      const start = performance.now()
      const tick = (now) => {
        const ratio = Math.min(1, (now - start) / HOLD_MS)
        setProgress(Math.round(ratio * 100))
        if (ratio < 1) frame = requestAnimationFrame(tick)
      }
      frame = requestAnimationFrame(tick)
    }

    return () => {
      clearTimeout(holdTimer)
      clearTimeout(doneTimer)
      cancelAnimationFrame(frame)
      document.body.style.overflow = previousOverflow
    }
  }, [])

  if (phase === 'done') return null

  const leaving = phase === 'leaving'

  return (
    <div
      aria-label="Loading AegisScan AI"
      aria-live="polite"
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-surface-container-lowest transition-opacity duration-700 ${
        leaving ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
      role="status"
    >
      {/* Animated fiber background for the loading screen */}
      <div className="absolute inset-0 pointer-events-none">
        <GhostFibers {...FIBER_PROPS} />
      </div>

      {/* Ambient energy fields, vignette and a sweeping scanline */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[36rem] h-[36rem] rounded-full bg-primary/10 blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 right-10 w-80 h-80 rounded-full bg-secondary-container/20 blur-3xl pointer-events-none"></div>
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_35%,rgba(10,14,23,0.78)_100%)]"></div>
      <div className="splash-scanline absolute inset-x-0 h-28 pointer-events-none"></div>

      <div className="relative z-10 flex w-full max-w-md flex-col items-center px-margin text-center">
        {/* Forensic core: rotating radar sweep over concentric rings */}
        <div className="relative mb-space-lg flex h-40 w-40 items-center justify-center">
          <div className="splash-core absolute inset-0 rounded-full bg-primary/10 blur-2xl"></div>
          <div className="splash-sweep absolute inset-0 rounded-full"></div>
          <div className="splash-ring absolute inset-[4%] rounded-full border border-dashed border-primary/25"></div>
          <div className="splash-ring-rev absolute inset-[13%] rounded-full border-t-2 border-primary/70"></div>
          <div className="absolute inset-[16%] rounded-full border border-primary/15"></div>
          <div className="absolute inset-[27%] rounded-full border border-dashed border-primary/10"></div>
          <div className="glass-chip absolute inset-[32%] rounded-full"></div>
          <span className="material-symbols-outlined relative z-10 text-[46px] text-primary">verified_user</span>
        </div>

        {/* Wordmark */}
        <div className="flex flex-col items-center gap-space-xs">
          <span className="font-headline-lg text-headline-lg font-semibold tracking-tight text-on-surface">
            AegisScan{' '}
            <span className="font-label-md text-label-md font-mono tracking-wider text-primary">
              // NEURAL FORENSICS
            </span>
          </span>
          <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">
            Forensic Integrity Suite
          </span>
        </div>

        {/* Progress readout */}
        <div className="mt-space-lg w-full">
          <div className="flex items-end justify-between font-label-sm text-label-sm">
            <span className="font-mono text-on-surface-variant uppercase tracking-widest">
              Loading neural weights
            </span>
            <span className="font-headline-sm text-headline-sm font-mono tabular-nums text-primary">
              {progress}%
            </span>
          </div>
          <div className="glass-well mt-space-xs h-2.5 w-full overflow-hidden rounded-full p-0.5">
            <div className="splash-bar-fill h-full origin-left rounded-full bg-gradient-to-r from-primary-container via-primary to-secondary"></div>
          </div>
        </div>

        {/* Boot log — lines check off as the percentage passes each threshold */}
        <div className="glass mt-space-lg flex w-full flex-col gap-space-sm rounded-2xl p-space-md text-left">
          {BOOT_LINES.map(({ label, at }) => {
            const done = progress >= at
            return (
              <div
                key={label}
                className={`flex items-center gap-space-sm font-label-sm text-label-sm transition-opacity duration-500 ${
                  done ? 'text-on-surface opacity-100' : 'text-on-surface-variant opacity-50'
                }`}
              >
                <span
                  className={`material-symbols-outlined text-[18px] ${done ? 'text-primary' : 'animate-spin'}`}
                >
                  {done ? 'check_circle' : 'progress_activity'}
                </span>
                <span>{label}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Footer telemetry */}
      <div className="absolute bottom-space-lg left-0 right-0 flex items-center justify-center gap-space-sm px-margin font-label-sm text-label-sm font-mono text-on-surface-variant">
        <span className="text-primary">●</span>
        <span>Neural inference core</span>
        <span className="text-outline-variant/60">|</span>
        <span>TensorFlow 2.21 · Keras 3</span>
      </div>
    </div>
  )
}
