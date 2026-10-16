import { useCallback, useEffect, useState } from 'react'
import { fetchBenchmarks } from '../lib/api.js'

function numberWithCommas(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function FactCard({ icon, label, value, sub, tone }) {
  const toneText = tone === 'error' ? 'text-error' : tone === 'tertiary' ? 'text-tertiary' : 'text-primary'
  return (
    <div className="relative overflow-hidden rounded-xl bg-surface-container-low p-space-md shadow-lg flex flex-col gap-space-xs">
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

function MetricTile({ label, value, detail, tone }) {
  const toneText = tone === 'error' ? 'text-error' : tone === 'tertiary' ? 'text-tertiary' : 'text-primary'
  return (
    <div className="flex flex-col gap-space-xs rounded-xl bg-surface-container/70 p-space-md shadow-sm">
      <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">{label}</span>
      <span className={`font-headline-lg text-headline-lg font-bold font-mono ${toneText}`}>{value}</span>
      {detail && <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">{detail}</span>}
    </div>
  )
}

export default function Benchmarks() {
  const [data, setData] = useState(null)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true)
    else setStatus('loading')
    setError('')
    try {
      const payload = await fetchBenchmarks(refresh)
      setData(payload)
      setStatus('ready')
    } catch (loadError) {
      setError(loadError.message)
      setStatus('error')
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const payload = await fetchBenchmarks(false)
        if (!active) return
        setData(payload)
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

  const model = data?.model
  const dataset = data?.dataset
  const results = data?.results

  const metrics = results
    ? [
        { label: 'Accuracy', value: `${results.metrics.accuracy}%`, detail: `n = ${results.sampleCount}`, tone: 'primary' },
        { label: 'Precision', value: `${results.metrics.precision}%`, detail: 'positive = FAKE', tone: 'tertiary' },
        { label: 'Recall', value: `${results.metrics.recall}%`, detail: 'positive = FAKE', tone: 'tertiary' },
        { label: 'F1 score', value: `${results.metrics.f1}%`, detail: 'positive = FAKE', tone: 'secondary' },
        { label: 'Specificity', value: `${results.metrics.specificity}%`, detail: 'true-negative rate', tone: 'primary' },
        {
          label: 'Balanced accuracy',
          value: `${results.metrics.balancedAccuracy}%`,
          detail: 'mean of recall & specificity',
          tone: 'secondary',
        },
        { label: 'False positive', value: `${results.metrics.falsePositiveRate}%`, detail: 'real flagged fake', tone: 'error' },
        { label: 'False negative', value: `${results.metrics.falseNegativeRate}%`, detail: 'fake missed', tone: 'error' },
      ]
    : []

  return (
    <div className="w-full px-margin py-space-lg flex flex-col gap-space-lg max-w-[1720px] mx-auto">
      <header className="flex flex-col gap-space-md">
        <div className="flex flex-wrap items-center gap-space-sm font-label-sm text-label-sm">
          <span className="inline-flex items-center gap-space-xs px-space-sm py-0.5 rounded-full bg-surface-container-high text-primary uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping"></span>
            Dataset Benchmarks
          </span>
          <span className="font-mono text-on-surface-variant">EVALUATION: REAL MODEL, REAL METRICS</span>
        </div>
        <h1 className="font-display-lg text-display-lg text-on-surface tracking-tight">
          Empirical Benchmark Evaluation &amp; Generalization Testbeds
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant max-w-4xl">
          This page reports metrics measured by the backend on the{' '}
          <span className="text-primary font-medium">MobileNetV2 + BiLSTM + Multi-Head Attention</span> model it is
          actually serving. Nothing is hard-coded: when you place clips in{' '}
          <span className="font-mono text-on-surface">backend/test_videos/real</span> and{' '}
          <span className="font-mono text-on-surface">backend/test_videos/fake</span>, the backend runs the full
          pipeline over them and returns accuracy, precision, recall, F1, specificity and the confusion matrix.
        </p>
        <div className="flex flex-wrap items-center gap-space-xs">
          <button
            className="inline-flex items-center gap-space-xs px-space-md py-space-xs rounded-lg bg-surface-container-high hover:bg-surface-bright text-on-surface font-label-md text-label-md transition-all shadow-sm disabled:opacity-50"
            disabled={refreshing}
            onClick={() => load(true)}
            type="button"
          >
            <span className={`material-symbols-outlined text-[16px] text-primary ${refreshing ? 'animate-spin' : ''}`}>
              refresh
            </span>
            <span>{refreshing ? 'Recomputing…' : 'Recompute metrics'}</span>
          </button>
          {results?.evaluatedAt && (
            <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">
              Last evaluated: {new Date(results.evaluatedAt).toLocaleString()}
            </span>
          )}
        </div>
      </header>

      {status === 'loading' && (
        <div className="flex flex-col items-center justify-center gap-space-sm rounded-2xl bg-surface-container-low/70 backdrop-blur-xl p-space-xl shadow-xl">
          <span className="material-symbols-outlined text-primary text-[40px] animate-spin">progress_activity</span>
          <span className="font-headline-sm text-headline-sm text-on-surface">Loading benchmark report…</span>
          <span className="font-body-sm text-body-sm text-on-surface-variant">
            Reading /api/benchmarks from the Flask backend.
          </span>
        </div>
      )}

      {status === 'error' && (
        <div className="rounded-xl bg-error-container/30 border border-error/40 p-space-md flex items-start gap-space-sm">
          <span className="material-symbols-outlined text-error text-[20px] shrink-0">error</span>
          <div className="flex flex-col gap-0.5">
            <span className="font-label-md text-label-md font-semibold text-error uppercase tracking-wider">
              Could not load benchmarks
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">{error}</span>
          </div>
        </div>
      )}

      {status === 'ready' && model && (
        <>
          {/* Model facts (always real) */}
          <section className="flex flex-col gap-space-md">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-primary text-[20px]">memory</span>
              <h2 className="font-headline-md text-headline-md text-on-surface">Served model profile</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
              <FactCard
                icon="functions"
                label="Total parameters"
                value={numberWithCommas(model.totalParams)}
                sub="from the loaded model"
              />
              <FactCard
                icon="model_training"
                label="Trainable parameters"
                tone="tertiary"
                value={numberWithCommas(model.trainableParams)}
                sub={`${numberWithCommas(model.nonTrainableParams)} non-trainable`}
              />
              <FactCard
                icon="rule"
                label="Decision threshold"
                tone="primary"
                value={Number(model.threshold).toFixed(2)}
                sub="positive = FAKE ≥ θ"
              />
              <FactCard
                icon="deployed_code"
                label="Runtime"
                tone="secondary"
                value={model.device.type}
                sub={`TF ${model.framework.tensorflow} · Keras ${model.framework.keras}`}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
              <MetricTile label="Sequence length" value={`${model.sequenceLength} frames`} detail="per video" />
              <MetricTile label="Feature dim" value={`${model.featureDim}-d`} detail="MobileNetV2 output" />
              <MetricTile
                label="Feature extractor"
                value={numberWithCommas(model.featureExtractorParams)}
                detail="frozen ImageNet params"
              />
              <MetricTile label="Feature batch size" value={model.featureBatchSize} detail="memory-safe inference" />
            </div>
          </section>

          {/* Dataset status */}
          <section className="flex flex-col gap-space-md rounded-xl bg-surface-container-low p-space-lg shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-space-md">
              <div className="flex flex-col">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-primary text-[20px]">dataset</span>
                  <h2 className="font-headline-md text-headline-md text-on-surface">Evaluation dataset</h2>
                </div>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  Metrics are computed from clips the backend finds in the two labelled folders.
                </span>
              </div>
              <span
                className={`inline-flex items-center gap-space-xs px-space-sm py-0.5 rounded font-label-sm text-label-sm font-mono ${
                  dataset?.available ? 'bg-tertiary-container/30 text-tertiary' : 'bg-error-container/40 text-error'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${dataset?.available ? 'bg-tertiary' : 'bg-error'}`}></span>
                {dataset?.available ? 'DATASET PRESENT' : 'NO DATASET'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-md">
              <MetricTile label="Authentic clips" value={dataset?.realCount ?? 0} detail="test_videos/real" tone="tertiary" />
              <MetricTile label="Synthetic clips" value={dataset?.fakeCount ?? 0} detail="test_videos/fake" tone="error" />
              <MetricTile label="Total clips" value={dataset?.total ?? 0} detail="evaluable videos" tone="primary" />
            </div>

            {!dataset?.available && (
              <div className="flex flex-col gap-space-xs rounded-xl bg-surface-container-lowest/70 p-space-md">
                <span className="font-label-md text-label-md font-semibold text-on-surface">
                  Add labelled videos to generate real metrics
                </span>
                <ol className="flex flex-col gap-space-xs font-body-sm text-body-sm text-on-surface-variant">
                  <li>
                    1. Put authentic clips in <span className="font-mono text-on-surface">backend/test_videos/real</span>.
                  </li>
                  <li>
                    2. Put manipulated clips in <span className="font-mono text-on-surface">backend/test_videos/fake</span>.
                  </li>
                  <li>3. Press “Recompute metrics”. Each clip must be long enough for 30 sampled frames.</li>
                </ol>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  Supported: .mp4 .avi .mov .mkv .webm. Metrics need at least one clip in each folder.
                </span>
              </div>
            )}
          </section>

          {/* Metrics */}
          {dataset?.available && results && (
            <>
              <section className="flex flex-col gap-space-md">
                <div className="flex flex-wrap items-center justify-between gap-space-sm">
                  <div className="flex items-center gap-space-xs">
                    <span className="material-symbols-outlined text-primary text-[20px]">query_stats</span>
                    <h2 className="font-headline-md text-headline-md text-on-surface">Measured performance</h2>
                  </div>
                  <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">
                    n = {results.sampleCount} · θ = {Number(results.threshold).toFixed(2)} · positive = {results.positiveClass}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
                  {metrics.map((metric) => (
                    <MetricTile
                      key={metric.label}
                      detail={results ? metric.detail : undefined}
                      label={metric.label}
                      tone={metric.tone}
                      value={metric.value}
                    />
                  ))}
                </div>

                {/* Confusion matrix */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-space-sm">
                  <div className="p-space-md rounded-xl bg-surface-container-lowest relative overflow-hidden">
                    <div className="absolute inset-0 bg-primary/10"></div>
                    <div className="relative z-10 flex flex-col gap-space-xs">
                      <span className="font-label-sm text-label-sm text-primary font-mono font-semibold">
                        TRUE POSITIVE
                      </span>
                      <span className="font-headline-lg text-headline-lg font-mono font-bold text-on-surface">
                        {results.confusion.tp}
                      </span>
                      <span className="font-label-sm text-label-sm text-on-surface-variant">fakes caught</span>
                    </div>
                  </div>
                  <div className="relative overflow-hidden rounded-xl bg-surface-container-lowest p-space-md">
                    <div className="absolute inset-0 bg-error/10"></div>
                    <div className="relative z-10 flex flex-col gap-space-xs">
                      <span className="font-label-sm text-label-sm text-error font-mono font-semibold">FALSE NEGATIVE</span>
                      <span className="font-headline-lg text-headline-lg text-error font-mono font-bold">
                        {results.confusion.fn}
                      </span>
                      <span className="font-label-sm text-label-sm text-on-surface-variant">fakes missed</span>
                    </div>
                  </div>
                  <div className="relative overflow-hidden rounded-xl bg-surface-container-lowest p-space-md">
                    <div className="absolute inset-0 bg-secondary/10"></div>
                    <div className="relative z-10 flex flex-col gap-space-xs">
                      <span className="font-label-sm text-label-sm text-secondary font-mono font-semibold">FALSE POSITIVE</span>
                      <span className="font-headline-lg text-headline-lg text-secondary font-mono font-bold">
                        {results.confusion.fp}
                      </span>
                      <span className="font-label-sm text-label-sm text-on-surface-variant">real flagged fake</span>
                    </div>
                  </div>
                  <div className="relative overflow-hidden rounded-xl bg-surface-container-lowest p-space-md">
                    <div className="absolute inset-0 bg-tertiary/10"></div>
                    <div className="relative z-10 flex flex-col gap-space-xs">
                      <span className="font-label-sm text-label-sm text-tertiary font-mono font-semibold">TRUE NEGATIVE</span>
                      <span className="font-headline-lg text-headline-lg text-on-surface font-mono font-bold">
                        {results.confusion.tn}
                      </span>
                      <span className="font-label-sm text-label-sm text-on-surface-variant">authentic verified</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Per-video results */}
              <section className="flex flex-col gap-space-md rounded-xl bg-surface-container-low p-space-lg shadow-xl">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-primary text-[20px]">list_alt</span>
                  <h2 className="font-headline-md text-headline-md text-on-surface">Per-clip results</h2>
                </div>
                <div className="overflow-x-auto w-full">
                  <table className="w-full min-w-[640px] text-left font-body-sm text-body-sm">
                    <thead>
                      <tr className="bg-surface-container-lowest text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider">
                        <th className="py-space-sm px-space-md rounded-l-lg">Clip</th>
                        <th className="py-space-sm px-space-md">True label</th>
                        <th className="py-space-sm px-space-md">Predicted</th>
                        <th className="py-space-sm px-space-md text-right">P(fake)</th>
                        <th className="py-space-sm px-space-md text-right rounded-r-lg">Correct</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.videos.map((video) => (
                        <tr key={video.file} className="border-t border-outline-variant/20">
                          <td className="p-space-sm font-mono text-label-sm text-on-surface truncate max-w-[280px]">
                            {video.file}
                          </td>
                          <td className="p-space-sm font-mono text-label-sm text-on-surface-variant">{video.trueLabel}</td>
                          <td
                            className={`p-space-sm font-mono text-label-sm font-semibold ${
                              video.predictedLabel === 'FAKE' ? 'text-error' : 'text-tertiary'
                            }`}
                          >
                            {video.predictedLabel}
                          </td>
                          <td className="p-space-sm font-mono text-label-sm text-on-surface-variant text-right">
                            {Number(video.fakeProbability).toFixed(2)}%
                          </td>
                          <td className="p-space-sm text-right">
                            <span
                              className={`material-symbols-outlined text-[18px] ${
                                video.correct ? 'text-tertiary' : 'text-error'
                              }`}
                            >
                              {video.correct ? 'check_circle' : 'cancel'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {Array.isArray(results.skipped) && results.skipped.length > 0 && (
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    Skipped {results.skipped.length} clip(s) that could not be decoded or were too short.
                  </span>
                )}
              </section>
            </>
          )}

          {dataset?.available && !results && (
            <div className="rounded-xl bg-error-container/30 border border-error/40 p-space-md font-body-sm text-body-sm text-on-surface-variant">
              The dataset folders were found but no clip produced a usable sequence. Make sure each clip is long enough
              for 30 sampled frames and is a readable video, then recompute.
            </div>
          )}

          <div className="rounded-xl bg-surface-container-lowest/60 p-space-md font-body-sm text-body-sm text-on-surface-variant">
            <strong className="text-on-surface">Note:</strong> no benchmark dataset ships with this app. The numbers
            above only appear once you supply labelled clips; they are produced by evaluating the deployed model, not
            copied from a paper. Cross-dataset figures for models the app does not run are intentionally not shown.
          </div>
        </>
      )}
    </div>
  )
}
