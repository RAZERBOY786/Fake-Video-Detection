import { NavLink, Outlet } from 'react-router-dom'

export function Header() {
  const navItems = [
    { to: '/', label: 'Scan', icon: 'radar' },
    { to: '/architecture', label: 'Architecture', icon: 'polyline' },
    { to: '/reports', label: 'Reports', icon: 'description' },
    { to: '/benchmarks', label: 'Benchmarks', icon: 'table_chart' },
  ]

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-surface-container-lowest/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.6)] border-b border-outline-variant/30">
      <div className="min-h-16 w-full px-margin flex flex-wrap items-center justify-between gap-space-sm">
        <NavLink className="flex items-center gap-space-sm" to="/">
          <div className="relative flex items-center justify-center">
            <span className="absolute -inset-1 rounded-full bg-primary/20 animate-pulse"></span>
            <span className="material-symbols-outlined text-primary text-[22px] relative z-10">
              verified_user
            </span>
          </div>
          <div className="flex flex-col">
            <span className="font-headline-sm text-headline-sm font-semibold tracking-tight text-on-surface">
              AegisScan{' '}
              <span className="text-primary font-label-md text-label-md tracking-wider font-mono">
                // NEURAL FORENSICS
              </span>
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">
              Forensic Integrity Suite
            </span>
          </div>
        </NavLink>

        <nav className="order-last w-full md:order-none md:w-auto md:flex-1 flex items-center justify-start md:justify-center gap-space-xs overflow-x-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              className={({ isActive }) =>
                `inline-flex items-center gap-space-xs px-space-sm py-space-xs rounded-lg font-label-sm text-label-sm transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-surface-container-high text-primary shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                }`
              }
              to={item.to}
            >
              <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
              <span className="hidden sm:inline">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-space-sm bg-surface-container-low/70 px-space-md py-space-xs rounded-xl border border-outline-variant/20 shadow-inner">
          <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">
            MODEL:
          </span>
          <span className="font-label-sm text-label-sm text-primary font-mono font-semibold">
            MobileNetV2 + BiLSTM + MHA
          </span>
        </div>
      </div>
    </header>
  )
}

export function Footer() {
  return (
    <footer className="w-full bg-surface-container-lowest/90 border-t border-outline-variant/30 py-space-lg backdrop-blur-md">
      <div className="w-full px-margin flex flex-col md:flex-row items-center justify-between gap-space-md">
        <div className="flex flex-col gap-space-xs text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-space-xs">
            <span className="material-symbols-outlined text-primary text-[18px]">neurology</span>
            <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
              Deepfake Detection System
            </span>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Bachelor of Engineering • Artificial Intelligence &amp; Data Science
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-space-xs font-label-sm text-label-sm">
          <span className="px-space-sm py-space-xs bg-surface-container-low text-primary rounded border border-primary/20">
            MobileNetV2
          </span>
          <span className="text-outline-variant/60">•</span>
          <span className="px-space-sm py-space-xs bg-surface-container-low text-secondary rounded border border-secondary/20">
            Bidirectional LSTM
          </span>
          <span className="text-outline-variant/60">•</span>
          <span className="px-space-sm py-space-xs bg-surface-container-low text-on-surface-variant rounded border border-outline-variant/30">
            TensorFlow
          </span>
          <span className="text-outline-variant/60">•</span>
          <span className="px-space-sm py-space-xs bg-surface-container-low text-tertiary rounded border border-tertiary/20">
            Flask
          </span>
        </div>
      </div>
    </footer>
  )
}

export default function Layout() {
  return (
    <>
      <Header />
      <main className="w-full flex-1 pt-16 bg-surface">
        <Outlet />
      </main>
      <Footer />
    </>
  )
}
