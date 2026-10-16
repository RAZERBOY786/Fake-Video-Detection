import GhostFibers from './GhostFibers.jsx'
import { FIBER_PROPS } from '../lib/fiberTheme.js'

// Fixed, full-viewport animated background shared by every page. It sits behind
// all content (negative z-index) and ignores pointer events, so it never blocks
// the UI — GhostFibers still reacts to the cursor because it listens on `window`.
export default function GhostBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[-10]">
      <GhostFibers {...FIBER_PROPS} />
    </div>
  )
}
