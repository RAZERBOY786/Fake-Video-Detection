import { FEATURE_EXTRACTOR, MODEL_CONFIG, MODEL_PARAMS, PIPELINE_STAGES, SEQUENCE_LAYERS } from '../data/modelSpec.js'

function numberWithCommas(n) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function Section({ title, icon, children, subtitle }) {
  return (
    <section className="flex flex-col gap-space-md rounded-2xl bg-surface-container-low/70 backdrop-blur-xl p-space-lg shadow-xl">
      <div className="flex flex-col gap-space-xs">
        <div className="flex items-center gap-space-xs">
          {icon && (
            <span className="material-symbols-outlined text-primary text-[22px]">
              {icon}
            </span>
          )}
          <h2 className="font-headline-lg text-headline-lg font-semibold text-on-surface tracking-tight">
            {title}
          </h2>
        </div>
        {subtitle && (
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            {subtitle}
          </p>
        )}
      </div>
      {children}
    </section>
  )
}

function LayerTable() {
  return (
    <div className="overflow-x-auto rounded-xl border border-outline-variant/30 shadow-inner bg-surface-container/60">
      <table className="w-full min-w-[640px]">
        <thead>
          <tr className="text-left bg-surface-container-lowest/80">
            <th className="p-space-sm font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">
              #
            </th>
            <th className="p-space-sm font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">
              Layer
            </th>
            <th className="p-space-sm font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">
              Type
            </th>
            <th className="p-space-sm font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">
              Output Shape
            </th>
            <th className="p-space-sm font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">
              Params
            </th>
            <th className="p-space-sm font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">
              Configuration / Notes
            </th>
          </tr>
        </thead>
        <tbody>
          {SEQUENCE_LAYERS.map((layer, index) => (
            <tr
              key={layer.name}
              className="border-t border-outline-variant/20 hover:bg-surface-container/40"
            >
              <td className="p-space-sm font-mono font-label-sm text-label-sm text-on-surface-variant">
                {index}
              </td>
              <td className="p-space-sm font-mono font-label-md text-label-md text-primary">
                {layer.name}
              </td>
              <td className="p-space-sm font-mono font-label-sm text-label-sm text-on-surface">
                {layer.type}
              </td>
              <td className="p-space-sm font-mono font-label-sm text-label-sm text-on-surface-variant">
                {layer.shape}
              </td>
              <td className="p-space-sm font-mono font-label-sm text-label-sm text-tertiary">
                {numberWithCommas(layer.params)}
              </td>
              <td className="p-space-sm font-body-sm text-body-sm text-on-surface-variant">
                <div className="flex flex-col gap-space-xs">
                  <span className="font-mono text-label-sm">{layer.config}</span>
                  <span>{layer.note}</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-outline-variant/30 bg-surface-container-lowest/60">
            <td className="p-space-sm font-label-md text-label-md text-on-surface-variant" colSpan={4}>
              Trainable parameters (loaded model)
            </td>
            <td className="p-space-sm font-mono font-label-md text-label-md text-tertiary">
              {numberWithCommas(MODEL_PARAMS.trainable)}
            </td>
            <td className="p-space-sm font-body-sm text-body-sm text-on-surface-variant">
              {MODEL_PARAMS.trainable.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')} trainable params
              ({MODEL_PARAMS.sizeMB} MB). Non-trainable: {MODEL_PARAMS.nonTrainable}.
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

export default function ModelArchitecture() {
  return (
    <div className="w-full px-margin py-space-lg flex flex-col gap-space-lg">
      <header className="flex flex-col gap-space-xs">
        <div className="inline-flex w-max items-center gap-space-xs px-space-md py-space-xs rounded-full bg-surface-container-high/80 backdrop-blur-md shadow-sm">
          <span className="material-symbols-outlined text-primary text-[18px]">polyline</span>
          <span className="font-label-sm text-label-sm text-primary uppercase tracking-widest font-mono">
            Hybrid Spatio-Temporal Pipeline
          </span>
        </div>
        <h1 className="font-display-lg text-display-lg font-bold tracking-tight text-on-surface">
          Model Architecture
          <span className="block bg-gradient-to-r from-primary via-primary-fixed to-secondary bg-clip-text text-transparent">
            (what the system actually implements)
          </span>
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant max-w-4xl leading-relaxed">
          The backend runs a hybrid CNN+RNN+attention pipeline: MobileNetV2 extracts spatial features per face
          crop, a bidirectional LSTM stack models temporal dynamics, multi-head attention refines the sequence
          with a residual connection, and a small dense head produces a sigmoid verdict. All details below match{' '}
          <span className="font-mono text-on-surface">backend/model.py</span> and the loaded{' '}
          <span className="font-mono text-on-surface">backend/model.keras</span>.
        </p>
      </header>

      <Section
        icon="device_hub"
        subtitle="End-to-end execution from video upload to sigmoid verdict"
        title="Inference Pipeline"
      >
        <ol className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-gutter">
          {PIPELINE_STAGES.map((stage, index) => (
            <li
              key={stage.title}
              className="flex flex-col gap-space-sm rounded-xl bg-surface-container/70 p-space-md shadow-md"
            >
              <div className="flex items-center gap-space-xs">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface-container-high text-primary font-mono font-semibold">
                  {index + 1}
                </span>
                <span className="material-symbols-outlined text-primary text-[20px]">
                  {stage.icon}
                </span>
                <h3 className="font-label-lg text-label-lg text-on-surface font-semibold">
                  {stage.title}
                </h3>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                {stage.detail}
              </p>
            </li>
          ))}
        </ol>
      </Section>

      <Section
        icon="image_search"
        subtitle="Frozen ImageNet trunk used for spatial feature extraction"
        title="Feature Extractor"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter">
          <div className="flex flex-col gap-space-sm rounded-xl bg-surface-container/70 p-space-md">
            <h3 className="font-label-lg text-label-lg text-on-surface font-semibold">
              Configuration
            </h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-space-xs font-body-sm text-body-sm">
              <div>
                <dt className="text-on-surface-variant">Architecture</dt>
                <dd className="font-mono text-on-surface">{FEATURE_EXTRACTOR.name}</dd>
              </div>
              <div>
                <dt className="text-on-surface-variant">Weights</dt>
                <dd className="font-mono text-on-surface">{FEATURE_EXTRACTOR.weights}</dd>
              </div>
              <div>
                <dt className="text-on-surface-variant">include_top</dt>
                <dd className="font-mono text-on-surface">{String(FEATURE_EXTRACTOR.includeTop)}</dd>
              </div>
              <div>
                <dt className="text-on-surface-variant">Pooling</dt>
                <dd className="font-mono text-on-surface">{FEATURE_EXTRACTOR.pooling}</dd>
              </div>
              <div>
                <dt className="text-on-surface-variant">Input shape</dt>
                <dd className="font-mono text-on-surface">{FEATURE_EXTRACTOR.inputShape}</dd>
              </div>
              <div>
                <dt className="text-on-surface-variant">Output dimension</dt>
                <dd className="font-mono text-on-surface">{FEATURE_EXTRACTOR.outputDim}-d</dd>
              </div>
            </dl>
          </div>
          <div className="flex flex-col gap-space-sm rounded-xl bg-surface-container/70 p-space-md">
            <h3 className="font-label-lg text-label-lg text-on-surface font-semibold">
              Notes
            </h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
              {FEATURE_EXTRACTOR.note}
            </p>
          </div>
        </div>
      </Section>

      <Section
        icon="schema"
        subtitle="Bidirectional LSTM ×2 → Multi-Head Attention (residual) → GAP → Dense head → sigmoid"
        title="Sequence Head (Layer-by-Layer)"
      >
        <LayerTable />
      </Section>

      <Section
        icon="settings_applications"
        subtitle="Compact summary of hyperparameters and compile-time settings"
        title="Model Configuration"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-space-sm">
          {MODEL_CONFIG.map((item) => (
            <div
              key={item.label}
              className="flex flex-col gap-space-xs rounded-xl bg-surface-container/70 p-space-md shadow-sm"
            >
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">
                {item.label}
              </span>
              <span className="font-mono font-label-lg text-label-lg text-on-surface">{item.value}</span>
            </div>
          ))}
        </div>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Parameter totals above are from the actual loaded model ({MODEL_PARAMS.sizeMB} MB). The head uses
          L2 regularisation (1e-4) on the Dense layers as defined in <span className="font-mono">model.py</span>.
        </p>
      </Section>

      <Section
        icon="fact_check"
        subtitle="Notes about visualisations/explainability mentioned in the design reference"
        title="What Is — and Is Not — Included"
      >
        <div className="flex flex-col gap-space-sm rounded-xl bg-surface-container/70 p-space-md">
          <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
            This architecture page sticks to what the deployed system actually implements: Haar cascade face
            detection (via OpenCV), 30 evenly sampled frames, MobileNetV2 features, BiLSTM + Multi-Head Attention, and
            a sigmoid decision at threshold 0.75. Forensic Reports are real dossiers persisted by the backend
            (<span className="font-mono text-on-surface">/api/reports</span>), and Dataset Benchmarks are measured on
            demand from clips you place in{' '}
            <span className="font-mono text-on-surface">backend/test_videos</span> (
            <span className="font-mono text-on-surface">/api/benchmarks</span>). MTCNN, Grad-CAM overlays and training
            curves are still not part of this app.
          </p>
        </div>
      </Section>
    </div>
  )
}
