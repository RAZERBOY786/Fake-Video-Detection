import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { clearReports, deleteReport, fetchReports } from '../lib/api.js'

function formatSize(bytes) {
  const value = Number(bytes)
  if (!Number.isFinite(value) || value <= 0) return '—'
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / (1024 * 1024)).toFixed(2)} MB`
}

function formatTime(iso) {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString()
}

function shortHash(hash) {
  if (!hash) return '—'
  return hash.length > 24 ? `${hash.slice(0, 16)}…${hash.slice(-8)}` : hash
}

function StatCard({ icon, label, value, sub, tone }) {
  const toneText = tone === 'error' ? 'text-error' : tone === 'tertiary' ? 'text-tertiary' : 'text-primary'
  return (
    <div className="relative overflow-hidden rounded-xl bg-surface-container/70 backdrop-blur-xl p-space-md shadow-md flex flex-col gap-space-xs">
      <div className="flex items-center justify-between">
        <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">
          {label}
        </span>
        <span className={`material-symbols-outlined text-[20px] ${toneText}`}>{icon}</span>
      </div>
      <span className="font-headline-lg text-headline-lg text-on-surface font-bold">{value}</span>
      {sub && <span className={`font-label-sm text-label-sm font-mono ${toneText}`}>{sub}</span>}
    </div>
  )
}

export default function Reports() {
  const [reports, setReports] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [verdict, setVerdict] = useState('all')
  const [selectedId, setSelectedId] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setStatus('loading')
    setError('')
    try {
      const data = await fetchReports()
      setReports(data.reports)
      setStatus('ready')
    } catch (loadError) {
      setError(loadError.message)
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const data = await fetchReports()
        if (!active) return
        setReports(data.reports)
        setStatus('ready')
      } catch (loadError) {
        if (!active) return
        setError(loadError.message)
        setStatus('error')
      }
    })()
    return () => {
      active = false
    }
  }, [])

  async function handleClear() {
    setBusy(true)
    try {
      await clearReports()
      setReports([])
      setSelectedId(null)
    } catch (clearError) {
      setError(clearError.message)
      setStatus('error')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(reportId) {
    setBusy(true)
    try {
      await deleteReport(reportId)
      setReports((current) => current.filter((item) => item.id !== reportId))
    } catch (deleteError) {
      setError(deleteError.message)
      setStatus('error')
    } finally {
      setBusy(false)
    }
  }

  function handleExport() {
    const blob = new Blob([JSON.stringify(reports, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `aegisscan-dossiers-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const total = reports.length
  const flagged = reports.filter((report) => report.label === 'FAKE').length
  const authentic = total - flagged
  const avgConfidence =
    total > 0 ? (reports.reduce((sum, report) => sum + Number(report.confidence || 0), 0) / total).toFixed(2) : '0.00'
  const threshold = total > 0 ? Number(reports[0].threshold ?? 0.75) : 0.75

  const filtered = reports.filter((report) => {
    if (verdict === 'fake' && report.label !== 'FAKE') return false
    if (verdict === 'real' && report.label !== 'REAL') return false
    if (query.trim()) {
      const needle = query.trim().toLowerCase()
      return (
        (report.fileName || '').toLowerCase().includes(needle) ||
        (report.sha256 || '').toLowerCase().includes(needle) ||
        (report.id || '').toLowerCase().includes(needle)
      )
    }
    return true
  })

  const selected = filtered.find((report) => report.id === selectedId) ?? filtered[0] ?? null

  return (
    <div className="w-full px-margin py-space-lg flex flex-col gap-space-lg">
      {/* Breadcrumb & classification bar */}
      <div className="flex flex-wrap items-center justify-between gap-space-sm bg-surface-container-lowest/60 backdrop-blur-md px-space-md py-space-xs rounded-xl shadow-sm">
        <div className="flex items-center gap-space-xs font-label-sm text-label-sm text-on-surface-variant">
          <span className="text-primary font-semibold font-mono">ROOT</span>
          <span>/</span>
          <span>EVIDENCE VAULT</span>
          <span>/</span>
          <span className="text-on-surface font-semibold font-mono">SERVER_PERSISTED_DOSSIERS</span>
        </div>
        <span className="inline-flex items-center gap-space-xs px-space-sm py-0.5 rounded bg-surface-container-high text-primary font-label-sm text-label-sm font-semibold tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
          LIVE RESULTS FROM THE FLASK BACKEND
        </span>
      </div>

      {/* Header + actions */}
      <header className="flex flex-col gap-space-md">
        <div className="flex flex-col gap-space-xs max-w-3xl">
          <div className="flex items-center gap-space-xs">
            <span className="px-space-xs py-0.5 rounded bg-error-container/40 text-error font-label-sm text-label-sm uppercase tracking-wider font-semibold">
              Forensic Reports
            </span>
            <span className="text-on-surface-variant font-label-sm text-label-sm">
              Evidence dossiers persisted server-side
            </span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
            Forensic Video Audit &amp; Tamper Dossiers
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Every scan you run is stored by the Flask backend as a dossier: verdict, probabilities, decision
            threshold, file size, SHA-256 of the uploaded bytes and extracted face frames. This page lists those real
            records — nothing here is precomputed or invented.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-space-xs">
          <button
            className="inline-flex items-center gap-space-xs px-space-md py-space-xs rounded-lg bg-surface-container-high hover:bg-surface-bright text-on-surface font-label-md text-label-md transition-all shadow-sm disabled:opacity-50"
            disabled={busy}
            onClick={load}
            type="button"
          >
            <span className="material-symbols-outlined text-[16px] text-primary">refresh</span>
            <span>Refresh vault</span>
          </button>
          <button
            className="inline-flex items-center gap-space-xs px-space-md py-space-xs rounded-lg bg-surface-container-high hover:bg-surface-bright text-on-surface font-label-md text-label-md transition-all shadow-sm disabled:opacity-50"
            disabled={total === 0}
            onClick={handleExport}
            type="button"
          >
            <span className="material-symbols-outlined text-[16px] text-tertiary">data_object</span>
            <span>Export dossiers (JSON)</span>
          </button>
          <button
            className="inline-flex items-center gap-space-xs px-space-md py-space-xs rounded-lg bg-surface-container-high hover:bg-surface-bright text-error font-label-md text-label-md transition-all shadow-sm disabled:opacity-50"
            disabled={busy || total === 0}
            onClick={handleClear}
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
            <span>Clear vault</span>
          </button>
        </div>
      </header>

      {status === 'error' && (
        <div className="rounded-xl bg-error-container/30 border border-error/40 p-space-md flex items-start gap-space-sm">
          <span className="material-symbols-outlined text-error text-[20px] shrink-0">error</span>
          <div className="flex flex-col gap-0.5">
            <span className="font-label-md text-label-md font-semibold text-error uppercase tracking-wider">
              Could not load dossiers
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">{error}</span>
          </div>
        </div>
      )}

      {/* Telemetry */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
        <StatCard icon="video_library" label="Dossiers in vault" value={total} sub="Persisted by the backend" />
        <StatCard icon="warning" label="Flagged synthetic" tone="error" value={flagged} sub="label = FAKE (θ)" />
        <StatCard icon="verified_user" label="Authentic" tone="tertiary" value={authentic} sub="label = REAL" />
        <StatCard
          icon="bolt"
          label="Mean confidence"
          tone="primary"
          value={`${avgConfidence}%`}
          sub={`θ = ${Number(threshold).toFixed(2)}`}
        />
      </div>

      {status === 'loading' && (
        <div className="flex flex-col items-center justify-center gap-space-sm rounded-2xl bg-surface-container-low/70 backdrop-blur-xl p-space-xl shadow-xl">
          <span className="material-symbols-outlined text-primary text-[40px] animate-spin">progress_activity</span>
          <span className="font-headline-sm text-headline-sm text-on-surface">Loading evidence vault…</span>
          <span className="font-body-sm text-body-sm text-on-surface-variant">
            Reading /api/reports from the Flask backend.
          </span>
        </div>
      )}

      {status === 'ready' && total === 0 && (
        <div className="flex flex-col items-center justify-center text-center gap-space-md rounded-2xl bg-surface-container-low/70 backdrop-blur-xl p-space-xl shadow-xl">
          <span className="material-symbols-outlined text-primary text-[48px]">folder_open</span>
          <h2 className="font-headline-md text-headline-md text-on-surface font-semibold">No dossiers yet</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant max-w-2xl">
            The vault is empty. Run a scan from the Scan page — each successful prediction is persisted here by the
            backend with its verdict, probabilities, threshold, SHA-256 and extracted frames.
          </p>
          <Link
            className="inline-flex items-center gap-space-xs px-space-lg py-space-sm rounded-lg bg-surface-container-high hover:bg-surface-bright text-primary font-label-md text-label-md transition-all shadow-md"
            to="/"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            <span>Go to Scan</span>
          </Link>
        </div>
      )}

      {status === 'ready' && total > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-lg items-start">
          {/* Evidence index */}
          <div className="xl:col-span-7 flex flex-col gap-space-md">
            {/* Filters */}
            <div className="rounded-xl bg-surface-container/90 backdrop-blur-xl p-space-md shadow-sm flex flex-col gap-space-sm">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-space-sm">
                <div className="md:col-span-8 relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3 text-on-surface-variant text-[18px]">
                    search
                  </span>
                  <input
                    className="w-full bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant/50 font-mono font-body-sm text-body-sm pl-10 pr-4 py-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary shadow-inner"
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search by dossier id, filename or SHA-256…"
                    type="text"
                    value={query}
                  />
                </div>
                <div className="md:col-span-4 relative">
                  <select
                    className="w-full bg-surface-container-lowest text-on-surface font-label-md text-label-md px-3 py-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
                    onChange={(event) => setVerdict(event.target.value)}
                    value={verdict}
                  >
                    <option value="all">Verdict: all ({total})</option>
                    <option value="fake">Synthetic / fake ({flagged})</option>
                    <option value="real">Authentic / real ({authentic})</option>
                  </select>
                  <span className="material-symbols-outlined pointer-events-none absolute right-3 top-2.5 text-on-surface-variant text-[18px]">
                    expand_more
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-space-xs font-label-sm text-label-sm text-on-surface-variant">
                <span>
                  Showing <strong className="text-on-surface font-mono">{filtered.length}</strong> of {total} dossiers
                </span>
                {(query || verdict !== 'all') && (
                  <button
                    className="text-primary hover:underline font-mono"
                    onClick={() => {
                      setQuery('')
                      setVerdict('all')
                    }}
                    type="button"
                  >
                    Reset filters
                  </button>
                )}
              </div>
            </div>

            {/* Dossier cards */}
            <div className="flex flex-col gap-space-sm">
              {filtered.map((report) => {
                const isFake = report.label === 'FAKE'
                const isSelected = selected?.id === report.id
                const frame = Array.isArray(report.frames) && report.frames.length > 0 ? report.frames[0] : null
                return (
                  <button
                    key={report.id}
                    className={`group text-left relative p-space-md rounded-xl shadow-lg transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-surface-container-high/90 ring-1 ring-primary/40'
                        : 'bg-surface-container/70 hover:bg-surface-container-high/70'
                    }`}
                    onClick={() => setSelectedId(report.id)}
                    type="button"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-space-sm">
                      <div className="flex items-start gap-space-sm min-w-0">
                        <div className="relative w-28 h-20 rounded-lg overflow-hidden bg-surface-container-lowest shrink-0 shadow-inner flex items-center justify-center">
                          {frame ? (
                            <img
                              alt={`${report.fileName} frame`}
                              className="w-full h-full object-cover opacity-90"
                              loading="lazy"
                              src={`data:image/jpeg;base64,${frame}`}
                            />
                          ) : (
                            <span className="material-symbols-outlined text-on-surface-variant text-[28px]">
                              movie
                            </span>
                          )}
                          <span
                            className={`absolute top-1 left-1 px-1 rounded font-mono font-label-sm text-[9px] font-bold ${
                              isFake ? 'bg-error-container text-error' : 'bg-tertiary-container/80 text-on-tertiary-container'
                            }`}
                          >
                            {isFake ? 'TAMPER' : 'AUTHENTIC'}
                          </span>
                        </div>
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <div className="flex flex-wrap items-center gap-space-xs">
                            <span className="font-label-md text-label-md font-bold text-primary font-mono tracking-wider">
                              #{report.id}
                            </span>
                            <span
                              className={`px-space-xs py-0.5 rounded font-label-sm text-label-sm font-semibold tracking-wider ${
                                isFake
                                  ? 'bg-error-container/50 text-error'
                                  : 'bg-tertiary-container/30 text-tertiary'
                              }`}
                            >
                              {isFake ? 'CONFIRMED DEEPFAKE' : 'CERTIFIED AUTHENTIC'}
                            </span>
                          </div>
                          <h3 className="font-headline-sm text-headline-sm text-on-surface truncate">
                            {report.fileName}
                          </h3>
                          <p className="font-label-sm text-label-sm text-on-surface-variant font-mono truncate">
                            SHA256: {shortHash(report.sha256)}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-space-xs font-label-sm text-label-sm text-on-surface-variant">
                            <span>{formatSize(report.fileSize)}</span>
                            <span>•</span>
                            <span className="font-mono">{formatTime(report.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-1 shrink-0">
                        <span className="font-label-sm text-label-sm uppercase text-on-surface-variant tracking-wider">
                          Confidence
                        </span>
                        <span
                          className={`font-headline-lg text-headline-lg font-bold ${
                            isFake ? 'text-error' : 'text-tertiary'
                          }`}
                        >
                          {Number(report.confidence).toFixed(2)}%
                        </span>
                        <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">
                          P(fake) {Number(report.fakeProbability).toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })}

              {filtered.length === 0 && (
                <div className="rounded-xl bg-surface-container-low/70 p-space-lg text-center font-body-sm text-body-sm text-on-surface-variant">
                  No dossiers match the current filters.
                </div>
              )}
            </div>
          </div>

          {/* Inspector */}
          <div className="xl:col-span-5 flex flex-col gap-space-md xl:sticky xl:top-20">
            {selected && (
              <div className="rounded-xl bg-surface-container/95 backdrop-blur-2xl p-space-md shadow-xl flex flex-col gap-space-md">
                <div className="flex items-center justify-between pb-space-xs">
                  <div className="flex items-center gap-space-xs">
                    <span className="material-symbols-outlined text-primary text-[22px]">fingerprint</span>
                    <div className="flex flex-col">
                      <h3 className="font-headline-sm text-headline-sm text-on-surface">Dossier Inspector</h3>
                      <span className="font-label-sm text-label-sm text-primary font-mono font-semibold">
                        #{selected.id}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`px-space-xs py-0.5 rounded font-label-sm text-label-sm font-mono font-bold ${
                      selected.label === 'FAKE' ? 'bg-error-container text-error' : 'bg-tertiary-container/30 text-tertiary'
                    }`}
                  >
                    {selected.label}
                  </span>
                </div>

                <div className="relative w-full aspect-video rounded-xl bg-surface-container-lowest overflow-hidden shadow-inner flex items-center justify-center">
                  {Array.isArray(selected.frames) && selected.frames.length > 0 ? (
                    <img
                      alt={`${selected.fileName} evidence frame`}
                      className="absolute inset-0 w-full h-full object-cover"
                      src={`data:image/jpeg;base64,${selected.frames[0]}`}
                    />
                  ) : (
                    <span className="material-symbols-outlined text-on-surface-variant text-[40px]">movie</span>
                  )}
                  <div className="relative z-10 mt-auto w-full flex items-center justify-between font-label-sm text-label-sm font-mono bg-surface-container-lowest/80 px-2 py-1 rounded backdrop-blur-md">
                    <span className="text-primary">VERDICT: {selected.label}</span>
                    <span className="text-on-surface-variant">
                      θ = {Number(selected.threshold ?? threshold).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-space-xs">
                  <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">
                    Probability decomposition
                  </span>
                  <div className="flex flex-col gap-space-xs">
                    <div className="flex items-center justify-between font-label-sm text-label-sm font-mono">
                      <span className="text-error">Synthetic</span>
                      <span className="text-error font-semibold">{Number(selected.fakeProbability).toFixed(2)}%</span>
                    </div>
                    <div className="w-full bg-surface-container-lowest h-1.5 rounded-full overflow-hidden">
                      <div className="bg-error h-full rounded-full" style={{ width: `${Number(selected.fakeProbability)}%` }}></div>
                    </div>
                    <div className="flex items-center justify-between font-label-sm text-label-sm font-mono">
                      <span className="text-tertiary">Authentic</span>
                      <span className="text-tertiary font-semibold">{Number(selected.realProbability).toFixed(2)}%</span>
                    </div>
                    <div className="w-full bg-surface-container-lowest h-1.5 rounded-full overflow-hidden">
                      <div className="bg-tertiary h-full rounded-full" style={{ width: `${Number(selected.realProbability)}%` }}></div>
                    </div>
                  </div>
                </div>

                <div className="p-space-sm rounded-xl bg-surface-container-lowest shadow-inner flex flex-col gap-1 font-mono font-label-sm text-label-sm text-on-surface-variant">
                  <div className="flex justify-between gap-space-sm">
                    <span className="text-on-surface-variant/70 shrink-0">File</span>
                    <span className="text-on-surface truncate">{selected.fileName}</span>
                  </div>
                  <div className="flex justify-between gap-space-sm">
                    <span className="text-on-surface-variant/70 shrink-0">Size</span>
                    <span className="text-on-surface">{formatSize(selected.fileSize)}</span>
                  </div>
                  <div className="flex justify-between gap-space-sm">
                    <span className="text-on-surface-variant/70 shrink-0">SHA-256</span>
                    <span className="text-primary truncate">{selected.sha256 || '—'}</span>
                  </div>
                  <div className="flex justify-between gap-space-sm">
                    <span className="text-on-surface-variant/70 shrink-0">Recorded</span>
                    <span className="text-on-surface">{formatTime(selected.createdAt)}</span>
                  </div>
                  <div className="flex justify-between gap-space-sm">
                    <span className="text-on-surface-variant/70 shrink-0">Frames stored</span>
                    <span className="text-on-surface">
                      {Array.isArray(selected.frames) ? selected.frames.length : 0}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-space-xs">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    SHA-256 is the hash of the uploaded bytes, computed by the backend at ingest.
                  </span>
                  <button
                    className="inline-flex items-center gap-space-xs px-space-sm py-1 rounded bg-surface-container-low hover:bg-surface text-error font-label-sm text-label-sm transition-all disabled:opacity-50"
                    disabled={busy}
                    onClick={() => handleDelete(selected.id)}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
