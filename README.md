# AegisScan AI — Deepfake Detection frontend

React + Vite frontend for the **Deepfake Video Detection** capstone. It is the UI for the Flask
inference service in [`backend/`](backend/README.md) and shows **only** what that service actually
provides.

## What the backend supports

`backend/app.py` exposes these routes:

| Method   | Path                    | Purpose                                                             |
| -------- | ----------------------- | ------------------------------------------------------------------- |
| `GET`    | `/`                     | The SPA build (or the backend's own Jinja page if `dist/` is absent). |
| `POST`   | `/api/predict`          | Upload a video, receive the deepfake verdict.                       |
| `GET`    | `/api/reports`          | List persisted scan dossiers (newest first).                        |
| `DELETE` | `/api/reports`          | Clear all dossiers.                                                 |
| `DELETE` | `/api/reports/<id>`     | Remove one dossier.                                                 |
| `GET`    | `/api/benchmarks`       | Served-model metadata + real evaluation metrics (see below).        |

`POST /api/predict` takes a single `file` field (`multipart/form-data`) and returns:

```json
{
  "success": true,
  "label": "FAKE",
  "confidence": 97.84,
  "fake_probability": 97.84,
  "real_probability": 2.16,
  "frames": ["<base64 jpeg>", "..."],
  "report": { "id": "EVD-20261016-7D60DD", "sha256": "…", "label": "FAKE", "…": "…" }
}
```

Every successful prediction is also persisted to `backend/reports.json` (a `report` object with the
verdict, probabilities, decision threshold, file size, SHA-256 of the uploaded bytes and up to two
extracted frames), capped at the 50 newest dossiers.

`POST /api/predict` takes a single `file` field (`multipart/form-data`) and returns:

```json
{
  "success": true,
  "label": "FAKE",
  "confidence": 97.84,
  "fake_probability": 97.84,
  "real_probability": 2.16,
  "frames": ["<base64 jpeg>", "..."]
}
```

Accepted formats: `.mp4 .avi .mov .mkv .webm` (mirrors `ALLOWED_EXTENSIONS` in `backend/utils.py`).
Upload cap: 500 MB. Verdict rule: the sigmoid output is a synthetic probability, classified `FAKE`
when `>= 0.75` (`THRESHOLD` in `backend/app.py`, tuned into `threshold.txt`).

The model is **MobileNetV2 → Bidirectional LSTM ×2 → Multi-Head Attention → sigmoid**
(`backend/model.py`).

## Pages

| Route           | Page               | Source of truth                                       |
| --------------- | ------------------ | ----------------------------------------------------- |
| `/`             | Video Analysis     | `POST /api/predict`                                   |
| `/architecture` | Model Architecture | `backend/model.py`, `utils.py`, `app.py`              |
| `/reports`      | Forensic Reports   | `GET /api/reports` (persisted real scans)             |
| `/benchmarks`   | Dataset Benchmarks | `GET /api/benchmarks` (real metrics, model metadata)  |

The extra pages were re-added from the `Q/` design export, but **re-grounded in the real backend**:
they cite the actual model (`backend/model.py`) and pipeline (`backend/utils.py`) rather than the
fabricated mockup content (Grad-CAM, MTCNN, invented benchmark tables, loss curves).

- **Model Architecture** renders the loaded model's real layer table (shapes + parameter counts read
  from `model.keras`) plus the MobileNetV2 extractor settings.
- **Forensic Reports** is a genuine, server-side feature: the backend persists every successful scan
  as a dossier (`/api/reports`) with the file name, SHA-256, size, verdict, probabilities, decision
  threshold and extracted face frames. The page lists, searches, filters, inspects, deletes and
  exports those real records.
- **Dataset Benchmarks** shows the served model's real parameter counts and runtime (TensorFlow/Keras
  version, CPU/GPU) from `/api/benchmarks`. When you place clips in
  `backend/test_videos/real` and `backend/test_videos/fake`, the backend runs the full pipeline over
  them and returns **measured** accuracy, precision, recall, F1, specificity, balanced accuracy, the
  confusion matrix and per-clip results. No dataset is bundled, so the page honestly reports
  "no dataset" until you add one.

`src/components/Layout.jsx` renders the header (brand + nav + the model fact the backend implements)
and the footer (mobile/framework badges from `backend/requirements.txt`).

## Frontend ↔ backend connection

`src/lib/api.js` is the only place that talks to Flask.

- **Development** — Vite proxies `/api` to `http://127.0.0.1:5000` (see `vite.config.js`), so the
  browser makes same-origin requests and no CORS setup is required. Start the backend first:

  ```bash
  cd backend && python app.py      # serves http://127.0.0.1:5000
  npm run dev                      # http://localhost:5173, proxies /api -> :5000
  ```

- **Single server (production)** — `backend/app.py` serves the built SPA itself. After
  `npm run build`, `python app.py` hosts the app and the API on one origin with no proxy and no CORS:

  ```bash
  npm run build
  cd backend && python app.py      # open http://127.0.0.1:5000
  ```

  `npm run preview` (port 4173) also proxies `/api` to `:5000` for previewing the build without Flask
  serving it.

- **Separately hosted build** — set `VITE_API_BASE_URL` to the backend origin, e.g.

  ```bash
  VITE_API_BASE_URL=http://127.0.0.1:5000 npm run build
  ```

  (The Flask app does not send CORS headers, so a cross-origin deployment also needs CORS added on
  the backend, or the build served from the same origin as the API — see the single-server mode.)

## Commands

```bash
npm install
npm run dev       # dev server (proxying /api to the Flask backend)
npm run build     # production build -> dist/
npm run preview   # serve the build
npm run lint      # oxlint
npm run verify    # build + theme/class/SSR checks
```

## Design tokens

`src/index.css` keeps the design system from the reference export as Tailwind v4 `@theme` variables
(palette, radius overrides — note `rounded-full` is `0.75rem`, not a pill —, the `space-*` /
`gutter*` / `margin*` spacing keys, the display/headline/body/label font sizes with line-height,
letter-spacing and weight, and the Space Grotesk / Plus Jakarta Sans / JetBrains Mono families).
`index.html` loads those three font families plus Material Symbols Outlined and sets
`<html class="dark">`.

## Verification tooling (`scripts/`)

- `check-theme.mjs` — compares every token in `src/index.css` against the reference Tailwind config
  (85 token groups).
- `check-classes.mjs` — asserts every Tailwind class used in `src/` produces a rule in the built CSS.
- `ssr-check.mjs` — server-renders the page and layout chrome through Vite's SSR loader; fails on
  runtime errors or React DOM-prop warnings.

```bash
npm run verify
```

## Behaviour notes

- Selecting a file (picker or drag-and-drop) validates the extension **and size** (≤ 500 MB), remembers
  the file and resets any previous verdict. Submitting uploads it to `POST /api/predict`.
- While a request is in flight the page shows an **indeterminate** progress bar — the API returns a
  single result, so no real percentage exists to display.
- The verdict card, confidence bar, fake/real probability meters and frame grid are all rendered
  from the response; `FAKE` uses the error palette and `REAL` the tertiary palette.
- A successful scan is persisted by the backend (`backend/reports.json`) and appears on `/reports`
  with its SHA-256, probabilities, threshold and extracted frames (up to two frames per dossier).
- Errors (unsupported format, file too large, backend unreachable, non-JSON/invalid response) surface
  inline with distinct messages.

## Notes

- `backend/` is a separate Flask + Keras service. In single-server mode Flask also serves the built
  `dist/`, so the frontend build is optional at dev time.
- Routing uses `BrowserRouter`. Flask's catch-all route serves `index.html` for client-side routes
  (`/architecture`, `/reports`, `/benchmarks`, …); if you serve `dist/` from a host without SPA
  rewrites, switch to `HashRouter` in `src/App.jsx` or configure rewrites.
- Runtime data lives beside the backend and is git-ignored: `backend/reports.json` (scan dossiers),
  `backend/benchmark_results.json` (cached evaluation) and `backend/test_videos/{real,fake}` (the
  optional evaluation dataset).
- The `Q/` folder is kept as the original design reference; the re-added pages are re-grounded in the
  real backend rather than copied from it.
