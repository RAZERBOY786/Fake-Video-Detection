import { useEffect, useState } from 'react'
import GhostFibers from './GhostFibers.jsx'
import { FIBER_PROPS } from '../lib/fiberTheme.js'

// The splash holds for 3 seconds, then fades out. FADE_MS must match the
// `duration-700` opacity transition used on the overlay below.
const HOLD_MS = 3000
const FADE_MS = 700

// Cosmetic boot log shown while the splash is on screen.
const BOOT_LINES = [
  'Loading spatio-temporal model weights',
  'Warming MobileNetV2 feature extractor',
  'Arming forensic evidence vault',
]

export default function SplashScreen() {
  // active -> leaving (fading out) -> done (unmounted)
  const [phase, setPhase] = useState('active')

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

    return () => {
      clearTimeout(holdTimer)
      clearTimeout(doneTimer)
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

      {/* Ambient energy fields */}
      <div className="absolute -top-24 left-1/4 w-96 h-96 rounded-full bg-primary/10 blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 right-10 w-80 h-80 rounded-full bg-secondary-container/20 blur-3xl pointer-events-none"></div>
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#4cd7f6_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none"></div>

      <div className="glass relative z-10 flex w-full max-w-xl flex-col items-center text-center rounded-[2rem] px-margin py-space-xl">
        {/* Emblem */}
        <div className="relative w-28 h-28 mb-space-lg flex items-center justify-center">
          <div className="absolute inset-0 rounded-[9999px] border border-primary/20 animate-ping"></div>
          <div
            className="absolute inset-1 rounded-[9999px] border border-dashed border-primary/30 animate-spin"
            style={{ animationDuration: '8s' }}
          ></div>
          <div
            className="absolute inset-4 rounded-[9999px] border-t-2 border-primary animate-spin"
            style={{ animationDuration: '1.6s' }}
          ></div>
          <div className="absolute inset-7 rounded-full bg-primary/15 blur-md"></div>
          <span className="material-symbols-outlined relative z-10 text-primary text-[40px]">
            verified_user
          </span>
        </div>

        {/* Wordmark */}
        <div className="flex flex-col items-center gap-space-xs mb-space-lg">
          <span className="font-headline-lg text-headline-lg font-semibold tracking-tight text-on-surface">
            AegisScan{' '}
            <span className="text-primary font-label-md text-label-md tracking-wider font-mono">
              // NEURAL FORENSICS
            </span>
          </span>
          <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">
            Forensic Integrity Suite
          </span>
        </div>

        {/* 3-second determinate progress */}
        <div className="w-full max-w-sm">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high">
            <div
              className="splash-bar-fill h-full w-full origin-left rounded-full bg-gradient-to-r from-primary-container via-primary to-secondary"
            ></div>
          </div>
          <div className="mt-space-sm flex items-center justify-between font-label-sm text-label-sm font-mono text-on-surface-variant">
            <span className="uppercase tracking-widest">Initializing</span>
            <span className="text-primary">Neural inference core</span>
          </div>
        </div>

        {/* Boot sequence */}
        <div className="glass-well mt-space-lg w-full max-w-sm rounded-lg p-space-sm text-left font-label-sm text-label-sm font-mono text-on-surface-variant/80 flex flex-col gap-1">
          {BOOT_LINES.map((line) => (
            <div key={line} className="flex items-center gap-2">
              <span className="text-primary animate-spin">◐</span>
              <span>{line}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
