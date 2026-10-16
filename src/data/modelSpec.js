// Single source of truth for the facts the UI states about the model.
//
// Every value here is copied from the backend source it points at, so the pages
// describe what the system actually does rather than an aspirational design:
//   backend/model.py         -> the sequence head architecture
//   backend/utils.py         -> frame sampling, face detection, feature extraction
//   backend/app.py           -> inference, upload limits, decision threshold
//   backend/train.py         -> training configuration and callbacks
//   backend/tune_threshold.py-> how the decision threshold was chosen
//   backend/threshold.txt    -> the chosen threshold (0.75)

export const FEATURE_EXTRACTOR = {
  name: 'MobileNetV2',
  weights: 'ImageNet',
  includeTop: false,
  pooling: 'avg',
  inputShape: '224 × 224 × 3',
  outputDim: 1280,
  note:
    'Frozen convolutional trunk used purely as a per-frame feature extractor; ' +
    'the classification head below learns on top of its 1280-d embeddings.',
}

// Sequential description of the sequence model, in build order.
// `shape` is the tensor shape after the layer runs (batch dim omitted) and
// `params` is the layer's parameter count, both read from the loaded model.
export const SEQUENCE_LAYERS = [
  {
    name: 'input_layer',
    type: 'Input',
    config: 'shape = (30, 1280)',
    shape: '(30, 1280)',
    params: 0,
    note: '30 sampled frames × 1280-d MobileNetV2 features',
  },
  {
    name: 'bidirectional',
    type: 'Bidirectional(LSTM)',
    config: 'units = 256, return_sequences = true, dropout = 0.3',
    shape: '(30, 512)',
    params: 3147776,
    note: 'Forward + backward pass; 2 × 256 concatenated',
  },
  {
    name: 'layer_normalization',
    type: 'LayerNormalization',
    config: 'default',
    shape: '(30, 512)',
    params: 1024,
    note: 'Stabilises the recurrent activations',
  },
  {
    name: 'bidirectional_1',
    type: 'Bidirectional(LSTM)',
    config: 'units = 128, return_sequences = true, dropout = 0.3',
    shape: '(30, 256)',
    params: 656384,
    note: 'Second temporal pass over the sequence',
  },
  {
    name: 'multi_head_attention',
    type: 'MultiHeadAttention',
    config: 'num_heads = 4, key_dim = 64, dropout = 0.2',
    shape: '(30, 256)',
    params: 263168,
    note: 'Attends across the 30 time steps (self-attention)',
  },
  {
    name: 'add',
    type: 'Add',
    config: 'residual: bidirectional_1 + multi_head_attention',
    shape: '(30, 256)',
    params: 0,
    note: 'Skip connection around the attention block',
  },
  {
    name: 'layer_normalization_1',
    type: 'LayerNormalization',
    config: 'default',
    shape: '(30, 256)',
    params: 512,
    note: 'Normalises the residual output',
  },
  {
    name: 'global_average_pooling1d',
    type: 'GlobalAveragePooling1D',
    config: 'default',
    shape: '(256)',
    params: 0,
    note: 'Mean over time → fixed-size embedding',
  },
  {
    name: 'dense',
    type: 'Dense',
    config: 'units = 256, activation = relu, L2 = 1e-4',
    shape: '(256)',
    params: 65792,
    note: 'First classification stage',
  },
  {
    name: 'dropout_1',
    type: 'Dropout',
    config: 'rate = 0.5',
    shape: '(256)',
    params: 0,
    note: 'Regularisation',
  },
  {
    name: 'dense_1',
    type: 'Dense',
    config: 'units = 64, activation = relu, L2 = 1e-4',
    shape: '(64)',
    params: 16448,
    note: 'Bottleneck before the verdict',
  },
  {
    name: 'dropout_2',
    type: 'Dropout',
    config: 'rate = 0.3',
    shape: '(64)',
    params: 0,
    note: 'Regularisation',
  },
  {
    name: 'dense_2',
    type: 'Dense',
    config: 'units = 1, activation = sigmoid',
    shape: '(1)',
    params: 65,
    note: 'Synthetic probability in [0, 1]',
  },
]

export const MODEL_PARAMS = {
  total: 4151169,
  trainable: 4151169,
  nonTrainable: 0,
  sizeMB: 15.84,
}

export const PIPELINE_STAGES = [
  {
    icon: 'movie',
    title: 'Frame sampling',
    detail:
      'The uploaded video is opened with OpenCV and 30 frames are sampled at even intervals across its duration (SEQUENCE_LENGTH = 30).',
  },
  {
    icon: 'face_6',
    title: 'Face detection & crop',
    detail:
      'A Haar cascade frontal-face detector locates the largest face per frame; a 25% margin is added and the crop is resized to 224 × 224. If no face is found, a centred square crop is used instead.',
  },
  {
    icon: 'grid_view',
    title: 'Spatial features',
    detail:
      'Each face is normalised with MobileNetV2 preprocess_input and passed through the frozen MobileNetV2 trunk, yielding a 1280-d vector per frame.',
  },
  {
    icon: 'timeline',
    title: 'Temporal modelling',
    detail:
      'The 30 × 1280 sequence runs through the bidirectional LSTM stack and multi-head attention, is pooled, and ends in a sigmoid.',
  },
  {
    icon: 'gavel',
    title: 'Decision',
    detail:
      'The sigmoid output is thresholded at 0.75 (threshold.txt): at or above means FAKE, below means REAL.',
  },
]

export const MODEL_CONFIG = [
  { label: 'Sequence length', value: '30 frames' },
  { label: 'Face crop size', value: '224 × 224' },
  { label: 'Feature vector', value: '1280-d' },
  { label: 'LSTM units', value: '256 → 128 (bidirectional)' },
  { label: 'Attention heads', value: '4' },
  { label: 'Attention key dim', value: '64' },
  { label: 'Dropout', value: '0.5 / 0.3' },
  { label: 'Output activation', value: 'sigmoid' },
  { label: 'Decision threshold', value: '0.75' },
  { label: 'Feature batch size', value: '2' },
]


