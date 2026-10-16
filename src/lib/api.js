// Single place the frontend talks to the Flask backend (backend/app.py).
//
// Endpoints used:
//   POST   /api/predict          -> run a scan on an uploaded video
//   GET    /api/reports          -> list persisted scan dossiers
//   DELETE /api/reports          -> clear all dossiers
//   DELETE /api/reports/<id>     -> remove one dossier
//   GET    /api/benchmarks       -> model metadata + real evaluation metrics
//
// API_BASE comes from VITE_API_BASE_URL. In dev and preview the Vite proxy
// forwards /api to http://127.0.0.1:5000, so it can stay empty (same-origin).

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

// Mirrors ALLOWED_EXTENSIONS in backend/utils.py and the accept="..." on the input.
export const ALLOWED_EXTENSIONS = ['.mp4', '.avi', '.mov', '.mkv', '.webm']

// Mirrors app.config["MAX_CONTENT_LENGTH"] in backend/app.py.
export const MAX_UPLOAD_MB = 500

export function isSupportedVideo(filename) {
  const name = (filename ?? '').toLowerCase()
  return ALLOWED_EXTENSIONS.some((extension) => name.endsWith(extension))
}

async function readJson(response) {
  try {
    return await response.json()
  } catch {
    throw new Error(
      `Server returned an invalid (non-JSON) response (HTTP ${response.status}).`,
    )
  }
}

/**
 * Upload a video and read the verdict from the backend.
 *
 * @param {File} file
 * @returns {Promise<{
 *   label: 'FAKE' | 'REAL',
 *   confidence: number,
 *   fake_probability: number,
 *   real_probability: number,
 *   frames: string[],
 *   report?: object,
 * }>}
 */
export async function predictVideo(file) {
  const formData = new FormData()
  formData.append('file', file)

  let response
  try {
    response = await fetch(`${API_BASE}/api/predict`, {
      method: 'POST',
      body: formData,
    })
  } catch (err) {
    throw new Error(
      'Could not reach the detection service. Make sure the Flask backend is running (python app.py on port 5000). ' +
        (err?.message || ''),
    )
  }

  const data = await readJson(response)

  if (!response.ok || data.success === false || data.error) {
    throw new Error(data.error || `Prediction failed (HTTP ${response.status}).`)
  }

  return data
}

async function requestJson(path, options = {}) {
  let response
  try {
    response = await fetch(`${API_BASE}${path}`, options)
  } catch (err) {
    throw new Error(
      'Could not reach the detection service. Make sure the Flask backend is running (python app.py on port 5000). ' +
        (err?.message || ''),
    )
  }

  const data = await readJson(response)

  if (!response.ok || data.success === false || data.error) {
    throw new Error(data.error || `Request failed (HTTP ${response.status}).`)
  }

  return data
}

/**
 * Dossiers persisted by the backend, newest first.
 *
 * @returns {Promise<{ count: number, reports: object[] }>}
 */
export async function fetchReports() {
  const data = await requestJson('/api/reports')
  return {
    count: Number(data.count ?? 0),
    reports: Array.isArray(data.reports) ? data.reports : [],
  }
}

/**
 * Delete every stored dossier.
 *
 * @returns {Promise<number>} number of dossiers removed
 */
export async function clearReports() {
  const data = await requestJson('/api/reports', { method: 'DELETE' })
  return Number(data.cleared ?? 0)
}

/**
 * Delete a single dossier by id.
 *
 * @param {string} reportId
 * @returns {Promise<number>} number of dossiers removed (0 or 1)
 */
export async function deleteReport(reportId) {
  const data = await requestJson(
    `/api/reports/${encodeURIComponent(reportId)}`,
    { method: 'DELETE' },
  )
  return Number(data.removed ?? 0)
}

/**
 * Model metadata plus real evaluation metrics.
 *
 * Metrics are only produced when the backend finds videos in
 * backend/test_videos/real and backend/test_videos/fake; otherwise
 * `dataset.available` is false and `results` is null.
 *
 * @param {boolean} refresh force re-evaluation instead of using the cache
 * @returns {Promise<{
 *   model: object,
 *   dataset: { realCount: number, fakeCount: number, total: number, realDir: string, fakeDir: string, available: boolean },
 *   results: object | null,
 * }>}
 */
export async function fetchBenchmarks(refresh = false) {
  return requestJson(`/api/benchmarks${refresh ? '?refresh=1' : ''}`)
}
