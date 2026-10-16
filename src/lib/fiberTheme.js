// GhostFibers tuning, kept on the AegisScan palette so the animated background
// matches the rest of the forensics UI. Shared by the page background and the
// splash (loading) screen. See components/GhostFibers.jsx for the full prop list.
export const FIBER_PROPS = {
  glowColor: '#4cd7f6', // --color-primary
  secondaryColor: '#c0c1ff', // --color-secondary
  gradient: 'depth',
  layers: 3,
  threads: 64,
  twist: 1.15,
  depthOfField: 0.85,
  hoverEffect: 'focus',
  speed: 0.45,
  flow: 0.4,
  particles: 0.5,
  sparkle: 0.5,
  glow: 0.8,
  brightness: 0.85,
  vignette: 0.4,
  grain: 0.06,
  mouseInteraction: true,
  pulseOnClick: true,
  intro: true,
}
