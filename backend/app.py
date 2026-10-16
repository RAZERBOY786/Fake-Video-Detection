"""
Deepfake Detection Flask Web Application
Memory-safe inference for 8 GB RAM systems
"""

import os
import gc
import cv2
import json
import uuid
import base64
import hashlib
import threading
import numpy as np

from datetime import datetime, timezone

from flask import (
    Flask,
    render_template,
    request,
    jsonify,
    send_from_directory,
)
from werkzeug.utils import secure_filename

import tensorflow as tf

from tensorflow.keras.models import load_model
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input

from utils import (
    MODEL_PATH,
    allowed_file,
    extract_frames,
    load_feature_extractor,
)


# ============================================================
# FLASK CONFIGURATION
# ============================================================

app = Flask(__name__)

UPLOAD_FOLDER = "uploads"

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["MAX_CONTENT_LENGTH"] = 500 * 1024 * 1024


# ============================================================
# FRONTEND BUILD (served by Flask so a single process hosts the SPA + API)
# ============================================================
# `npm run build` emits the React app into <project root>/dist. When that
# exists Flask serves it at "/", so the whole product runs from one command
# (`python app.py`) on one origin — no proxy and no CORS needed.

FRONTEND_DIST = os.path.abspath(
    os.path.join(
        os.path.dirname(__file__),
        "..",
        "dist",
    )
)


# ============================================================
# MODEL CONFIGURATION
# ============================================================

THRESHOLD = 0.75

FEATURE_BATCH_SIZE = 2


print("Loading MobileNetV2...")

feature_extractor = load_feature_extractor()


print("Loading trained model...")

if not os.path.exists(MODEL_PATH):
    raise FileNotFoundError(
        f"{MODEL_PATH} not found."
    )

model = load_model(MODEL_PATH)


print("System Ready.")


# ============================================================
# PERSISTENCE & BENCHMARK CONFIGURATION
# ============================================================

# All on-disk state lives next to this file, independent of the cwd.
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))

# Scans are persisted here so the Reports page shows real, durable dossiers.
REPORTS_FILE = os.path.join(BACKEND_DIR, "reports.json")

# Newest-first cap. Frames are base64 JPEGs, so this keeps the file small.
MAX_STORED_REPORTS = 50
FRAMES_PER_REPORT = 2

# Drop labelled videos into these folders, then call GET /api/benchmarks to have
# the backend evaluate the model and return REAL metrics (accuracy/F1/…).
TEST_REAL_DIR = os.path.join(BACKEND_DIR, "test_videos", "real")
TEST_FAKE_DIR = os.path.join(BACKEND_DIR, "test_videos", "fake")

# Cached evaluation output, keyed by a signature of the dataset contents.
BENCHMARK_FILE = os.path.join(BACKEND_DIR, "benchmark_results.json")

VIDEO_EXTENSIONS = (".mp4", ".avi", ".mov", ".mkv", ".webm")

_reports_lock = threading.Lock()

_benchmark_cache = {
    "signature": None,
    "results": None,
}

def encode_frames(frames):

    previews = []

    for frame in frames:

        frame_bgr = cv2.cvtColor(
            frame,
            cv2.COLOR_RGB2BGR
        )

        success, buffer = cv2.imencode(
            ".jpg",
            frame_bgr
        )

        if success:

            previews.append(
                base64.b64encode(
                    buffer
                ).decode("utf-8")
            )

    return previews


# ============================================================
# REPORT PERSISTENCE (real dossiers stored server-side)
# ============================================================

def now_iso():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def sha256_of_file(path, chunk_size=1024 * 1024):

    digest = hashlib.sha256()

    with open(path, "rb") as handle:

        for chunk in iter(lambda: handle.read(chunk_size), b""):

            digest.update(chunk)

    return digest.hexdigest()


def load_stored_reports():

    if not os.path.exists(REPORTS_FILE):
        return []

    try:

        with open(REPORTS_FILE, "r", encoding="utf-8") as handle:

            data = json.load(handle)

    except (OSError, ValueError):

        return []

    return data if isinstance(data, list) else []


def save_stored_reports(reports):

    temporary = REPORTS_FILE + ".tmp"

    with open(temporary, "w", encoding="utf-8") as handle:

        json.dump(reports, handle)

    os.replace(temporary, REPORTS_FILE)


def record_report(file_name, file_size, sha256, result):

    record = {
        "id": "EVD-{}-{}".format(
            datetime.now(timezone.utc).strftime("%Y%m%d"),
            uuid.uuid4().hex[:6].upper(),
        ),
        "createdAt": now_iso(),
        "fileName": file_name,
        "fileSize": int(file_size),
        "sha256": sha256,
        "label": result.get("label"),
        "confidence": float(result.get("confidence", 0.0)),
        "fakeProbability": float(result.get("fake_probability", 0.0)),
        "realProbability": float(result.get("real_probability", 0.0)),
        "threshold": THRESHOLD,
        "frames": (result.get("frames") or [])[:FRAMES_PER_REPORT],
    }

    with _reports_lock:

        reports = load_stored_reports()

        reports.insert(0, record)

        save_stored_reports(reports[:MAX_STORED_REPORTS])

    return record


# ============================================================
# DATASET EVALUATION (real benchmark metrics)
# ============================================================

def list_dataset_videos(folder):

    if not os.path.isdir(folder):
        return []

    return sorted(
        name
        for name in os.listdir(folder)
        if name.lower().endswith(VIDEO_EXTENSIONS)
    )


def dataset_signature():

    parts = []

    for label, folder in (("real", TEST_REAL_DIR), ("fake", TEST_FAKE_DIR)):

        for name in list_dataset_videos(folder):

            path = os.path.join(folder, name)

            try:
                modified = int(os.path.getmtime(path))

            except OSError:
                modified = 0

            parts.append("{}:{}:{}".format(label, name, modified))

    return hashlib.sha256("|".join(parts).encode("utf-8")).hexdigest()


def infer_probability(video_path):
    """Lightweight inference: returns (synthetic_probability, error)."""

    frames, error = extract_frames(video_path)

    if frames is None:
        return None, error

    features = extract_features_memory_safe(frames)

    del frames
    gc.collect()

    sequence = np.expand_dims(features, axis=0)

    del features
    gc.collect()

    probability = float(
        model.predict(sequence, verbose=0)[0][0]
    )

    del sequence
    gc.collect()

    return probability, None


def evaluate_dataset():
    """Evaluate the loaded model over test_videos/{real,fake}.

    Positive class is FAKE. Returns a metrics payload, or None when there is
    nothing evaluable. Reuses the already-loaded model and feature extractor.
    """

    pairs = []

    for folder, true_label in (
        (TEST_REAL_DIR, "REAL"),
        (TEST_FAKE_DIR, "FAKE"),
    ):

        for name in list_dataset_videos(folder):

            pairs.append((os.path.join(folder, name), name, true_label))

    if not pairs:
        return None

    tp = fp = fn = tn = 0

    videos = []
    skipped = []

    for path, name, true_label in pairs:

        probability, error = infer_probability(path)

        if probability is None:

            skipped.append({"file": name, "trueLabel": true_label, "error": error})

            continue

        predicted_label = "FAKE" if probability >= THRESHOLD else "REAL"

        correct = predicted_label == true_label

        if true_label == "FAKE":

            if predicted_label == "FAKE":
                tp += 1
            else:
                fn += 1

        else:

            if predicted_label == "FAKE":
                fp += 1
            else:
                tn += 1

        videos.append({
            "file": name,
            "trueLabel": true_label,
            "predictedLabel": predicted_label,
            "fakeProbability": round(probability * 100, 2),
            "realProbability": round((1 - probability) * 100, 2),
            "correct": correct,
        })

    total = tp + fp + fn + tn

    if total == 0:
        return None

    precision = tp / (tp + fp) if (tp + fp) else 0.0
    recall = tp / (tp + fn) if (tp + fn) else 0.0
    specificity = tn / (tn + fp) if (tn + fp) else 0.0
    accuracy = (tp + tn) / total
    f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) else 0.0

    return {
        "threshold": THRESHOLD,
        "evaluatedAt": now_iso(),
        "sampleCount": total,
        "positiveClass": "FAKE",
        "confusion": {"tp": tp, "fp": fp, "fn": fn, "tn": tn},
        "metrics": {
            "accuracy": round(accuracy * 100, 2),
            "precision": round(precision * 100, 2),
            "recall": round(recall * 100, 2),
            "f1": round(f1 * 100, 2),
            "specificity": round(specificity * 100, 2),
            "balancedAccuracy": round((recall + specificity) / 2 * 100, 2),
            "falsePositiveRate": round((1 - specificity) * 100, 2),
            "falseNegativeRate": round((1 - recall) * 100, 2),
        },
        "videos": videos,
        "skipped": skipped,
    }


def load_cached_benchmark(signature):

    try:

        with open(BENCHMARK_FILE, "r", encoding="utf-8") as handle:

            data = json.load(handle)

    except (OSError, ValueError):

        return None

    if isinstance(data, dict) and data.get("signature") == signature:

        return data.get("results")

    return None


def save_benchmark(signature, results):

    try:

        with open(BENCHMARK_FILE, "w", encoding="utf-8") as handle:

            json.dump({"signature": signature, "results": results}, handle)

    except OSError:

        pass


# ============================================================
# MODEL METADATA (real, from the loaded objects)
# ============================================================

def device_info():

    try:

        gpus = tf.config.list_physical_devices("GPU")

    except Exception:

        gpus = []

    if gpus:

        return {"type": "GPU", "devices": [gpu.name for gpu in gpus]}

    return {"type": "CPU", "devices": []}


def build_model_metadata():

    input_shape = model.input_shape or (None, None, None)

    total_params = int(model.count_params())

    trainable_params = int(
        sum(int(np.prod(weight.shape)) for weight in model.trainable_weights)
    )

    return {
        "name": "MobileNetV2 + BiLSTM + Multi-Head Attention",
        "totalParams": total_params,
        "trainableParams": trainable_params,
        "nonTrainableParams": total_params - trainable_params,
        "featureExtractorParams": int(feature_extractor.count_params()),
        "sequenceLength": int(input_shape[1]),
        "featureDim": int(input_shape[2]),
        "imgSize": 224,
        "threshold": THRESHOLD,
        "featureBatchSize": FEATURE_BATCH_SIZE,
        "framework": {
            "tensorflow": getattr(tf, "__version__", "unknown"),
            "keras": getattr(tf.keras, "__version__", "unknown"),
        },
        "device": device_info(),
    }


# ============================================================
# MEMORY-SAFE FEATURE EXTRACTION
# ============================================================

def extract_features_memory_safe(frames):

    frames = frames.astype(
        np.float32,
        copy=False
    )

    frames = preprocess_input(frames)

    feature_batches = []

    for start in range(
        0,
        len(frames),
        FEATURE_BATCH_SIZE
    ):

        batch = frames[
            start:start + FEATURE_BATCH_SIZE
        ]

        features = feature_extractor.predict(
            batch,
            batch_size=FEATURE_BATCH_SIZE,
            verbose=0
        )

        feature_batches.append(features)

        del batch
        del features

        gc.collect()

    features = np.concatenate(
        feature_batches,
        axis=0
    )

    del feature_batches
    del frames

    gc.collect()

    return features


# ============================================================
# VIDEO PREDICTION
# ============================================================

def predict_video(video_path):

    try:

        # -----------------------------------------
        # Extract frames
        # -----------------------------------------

        frames, error = extract_frames(
            video_path
        )

        if frames is None:

            return {
                "success": False,
                "error": error
            }


        # -----------------------------------------
        # Save preview frames before cleanup
        # -----------------------------------------

        preview_frames = frames[:6].copy()


        # -----------------------------------------
        # MobileNetV2 feature extraction
        # -----------------------------------------

        features = extract_features_memory_safe(
            frames
        )

        del frames

        gc.collect()


        # -----------------------------------------
        # LSTM / Attention model prediction
        # -----------------------------------------

        sequence = np.expand_dims(
            features,
            axis=0
        )

        del features

        gc.collect()


        probability = float(
            model.predict(
                sequence,
                verbose=0
            )[0][0]
        )


        del sequence

        gc.collect()


        # -----------------------------------------
        # Final classification
        # -----------------------------------------

        fake_probability = probability * 100

        real_probability = (
            1 - probability
        ) * 100


        label = (
            "FAKE"
            if probability >= THRESHOLD
            else "REAL"
        )


        confidence = max(
            fake_probability,
            real_probability
        )


        # -----------------------------------------
        # Encode preview frames
        # -----------------------------------------

        previews = encode_frames(
            preview_frames
        )

        del preview_frames

        gc.collect()


        # -----------------------------------------
        # Return result
        # -----------------------------------------

        return {

            "success": True,

            "label": label,

            "confidence": round(
                confidence,
                2
            ),

            "fake_probability": round(
                fake_probability,
                2
            ),

            "real_probability": round(
                real_probability,
                2
            ),

            "frames": previews

        }


    except Exception as e:

        gc.collect()

        print("\nPrediction Error:")
        print(str(e))

        return {

            "success": False,

            "error": (
                "Prediction failed: "
                + str(e)
            )

        }


# ============================================================
# FRONTEND (built SPA) + HOME PAGE
# ============================================================

def _dist_index():
    return os.path.join(FRONTEND_DIST, "index.html")


@app.route("/")
def home():

    # Prefer the built React app when it is available.
    if os.path.exists(_dist_index()):

        return send_from_directory(
            FRONTEND_DIST,
            "index.html",
        )

    # Fallback: the Flask app's own (Jinja + Bootstrap) page.
    return render_template("index.html")


@app.route("/<path:filename>")
def frontend_assets(filename):

    # Serve any real file from the build (JS, CSS, favicon, images…).
    candidate = os.path.join(
        FRONTEND_DIST,
        filename,
    )

    if os.path.isfile(candidate):

        return send_from_directory(
            FRONTEND_DIST,
            filename,
        )

    # Client-side routes (e.g. /architecture) fall back to the SPA shell,
    # but genuinely missing files (with an extension) stay 404 so broken
    # asset requests are not silently answered with HTML.
    if (
        os.path.exists(_dist_index()) and
        "." not in os.path.basename(filename)
    ):

        return send_from_directory(
            FRONTEND_DIST,
            "index.html",
        )

    return ("Not found", 404)


# ============================================================
# PREDICTION API
# ============================================================

@app.route(
    "/api/predict",
    methods=["POST"]
)
def predict():

    try:

        # -----------------------------------------
        # Check uploaded file
        # -----------------------------------------

        if "file" not in request.files:

            return jsonify({

                "success": False,

                "error": "No file uploaded"

            }), 400


        file = request.files["file"]


        if file.filename == "":

            return jsonify({

                "success": False,

                "error": "No file selected"

            }), 400


        # -----------------------------------------
        # Validate extension
        # -----------------------------------------

        if not allowed_file(
            file.filename
        ):

            return jsonify({

                "success": False,

                "error": "Unsupported video format"

            }), 400


        # -----------------------------------------
        # Save uploaded video
        # -----------------------------------------

        filename = secure_filename(
            file.filename
        )

        filepath = os.path.join(
            app.config["UPLOAD_FOLDER"],
            filename
        )

        file.save(filepath)


        # -----------------------------------------
        # Run prediction
        # -----------------------------------------

        result = predict_video(
            filepath
        )


        # -----------------------------------------
        # Persist a real dossier (best-effort)
        # -----------------------------------------

        if result.get("success"):

            try:

                file_size = os.path.getsize(filepath)

                digest = sha256_of_file(filepath)

                record = record_report(
                    file.filename,
                    file_size,
                    digest,
                    result,
                )

                result["report"] = record

            except Exception as report_error:

                # Persistence must never break a successful prediction.
                print("\nReport persistence error:")
                print(str(report_error))


        # -----------------------------------------
        # Delete uploaded file
        # -----------------------------------------

        if os.path.exists(filepath):

            os.remove(filepath)


        return jsonify(result)


    except Exception as e:

        print("\nAPI Error:")
        print(str(e))

        return jsonify({

            "success": False,

            "error": (
                "Server error: "
                + str(e)
            )

        }), 500


# ============================================================
# REPORTS API
# ============================================================

@app.route(
    "/api/reports",
    methods=["GET"]
)
def get_reports():

    reports = load_stored_reports()

    return jsonify({
        "success": True,
        "count": len(reports),
        "reports": reports,
    })


@app.route(
    "/api/reports",
    methods=["DELETE"]
)
def delete_reports():

    with _reports_lock:

        reports = load_stored_reports()

        save_stored_reports([])

    return jsonify({
        "success": True,
        "cleared": len(reports),
    })


@app.route(
    "/api/reports/<report_id>",
    methods=["DELETE"]
)
def delete_report(report_id):

    with _reports_lock:

        reports = load_stored_reports()

        remaining = [
            report for report in reports
            if report.get("id") != report_id
        ]

        save_stored_reports(remaining)

    return jsonify({
        "success": True,
        "removed": len(reports) - len(remaining),
    })


# ============================================================
# BENCHMARKS API
# ============================================================

@app.route(
    "/api/benchmarks",
    methods=["GET"]
)
def get_benchmarks():

    try:

        refresh = request.args.get("refresh") in ("1", "true", "yes")

        real_videos = list_dataset_videos(TEST_REAL_DIR)
        fake_videos = list_dataset_videos(TEST_FAKE_DIR)

        dataset = {
            "realCount": len(real_videos),
            "fakeCount": len(fake_videos),
            "total": len(real_videos) + len(fake_videos),
            "realDir": "test_videos/real",
            "fakeDir": "test_videos/fake",
            "available": bool(real_videos and fake_videos),
        }

        results = None

        if dataset["available"]:

            signature = dataset_signature()

            cached = None

            if not refresh:

                if _benchmark_cache["signature"] == signature:

                    cached = _benchmark_cache["results"]

                else:

                    cached = load_cached_benchmark(signature)

            if cached is not None:

                results = cached

            else:

                results = evaluate_dataset()

            _benchmark_cache["signature"] = signature
            _benchmark_cache["results"] = results

            if results is not None:
                save_benchmark(signature, results)

        return jsonify({
            "success": True,
            "model": build_model_metadata(),
            "dataset": dataset,
            "results": results,
        })

    except Exception as e:

        print("\nBenchmark error:")
        print(str(e))

        return jsonify({
            "success": False,
            "error": "Benchmark evaluation failed: " + str(e),
        }), 500


# ============================================================
# START SERVER
# ============================================================

if __name__ == "__main__":

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=False
    )