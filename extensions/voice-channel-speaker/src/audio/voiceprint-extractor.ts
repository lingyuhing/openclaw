/**
 * Voiceprint embedding extractor using deep learning approach
 * Implements x-vector style speaker embedding extraction
 */

import {
  computeMelSpectrogram,
  preprocessAudio,
  DEFAULT_AUDIO_OPTIONS,
  extractVoiceActivity,
  calculateAudioQuality,
} from "../audio/audio-preprocessing.js";

export interface EmbeddingConfig {
  embeddingDim: number;
  sampleRate: number;
  nMels: number;
  nFft: number;
  hopLength: number;
  segmentLength: number; // Number of frames per segment
}

export const DEFAULT_EMBEDDING_CONFIG: EmbeddingConfig = {
  embeddingDim: 256,
  sampleRate: 16000,
  nMels: 40,
  nFft: 512,
  hopLength: 256,
  segmentLength: 100, // ~1.6 seconds at 16kHz with hop_length=256
};

/**
 * Neural network layer types
 */
type LayerType = "conv" | "relu" | "batchnorm" | "maxpool" | "linear" | "stats_pool";

interface Layer {
  type: LayerType;
  params: Record<string, number | number[]>;
}

/**
 * Simulated neural network for speaker embedding extraction
 * In production, this would use ONNX/TensorFlow.js with a pre-trained model
 */
class SpeakerEmbeddingNetwork {
  private config: EmbeddingConfig;
  private layers: Layer[];

  constructor(config: Partial<EmbeddingConfig> = {}) {
    this.config = { ...DEFAULT_EMBEDDING_CONFIG, ...config };
    this.layers = this.buildNetwork();
  }

  private buildNetwork(): Layer[] {
    // TDNN (Time-Delay Neural Network) architecture
    // Similar to x-vector architecture
    return [
      { type: "conv", params: { inChannels: 40, outChannels: 512, kernelSize: 5, dilation: 1 } },
      { type: "batchnorm", params: { numFeatures: 512 } },
      { type: "relu", params: {} },
      { type: "conv", params: { inChannels: 512, outChannels: 512, kernelSize: 3, dilation: 2 } },
      { type: "batchnorm", params: { numFeatures: 512 } },
      { type: "relu", params: {} },
      { type: "conv", params: { inChannels: 512, outChannels: 512, kernelSize: 3, dilation: 3 } },
      { type: "batchnorm", params: { numFeatures: 512 } },
      { type: "relu", params: {} },
      { type: "conv", params: { inChannels: 512, outChannels: 512, kernelSize: 1, dilation: 1 } },
      { type: "batchnorm", params: { numFeatures: 512 } },
      { type: "relu", params: {} },
      { type: "conv", params: { inChannels: 512, outChannels: 1500, kernelSize: 1, dilation: 1 } },
      { type: "batchnorm", params: { numFeatures: 1500 } },
      { type: "relu", params: {} },
      { type: "stats_pool", params: {} },
      { type: "linear", params: { inFeatures: 3000, outFeatures: 512 } },
      { type: "batchnorm", params: { numFeatures: 512 } },
      { type: "relu", params: {} },
      { type: "linear", params: { inFeatures: 512, outFeatures: this.config.embeddingDim } },
    ];
  }

  /**
   * Forward pass through the network
   * This is a simplified simulation - real implementation would use actual weights
   */
  forward(melSpectrogram: number[][]): number[] {
    // Convert mel spectrogram to frame-level features
    const frames = melSpectrogram;

    // Simulate TDNN processing with statistical pooling
    const frameEmbeddings = this.extractFrameEmbeddings(frames);

    // Statistical pooling: mean and std across time
    const pooled = this.statisticalPooling(frameEmbeddings);

    // Final embedding extraction
    const embedding = this.projectToEmbedding(pooled);

    // L2 normalize
    return this.l2Normalize(embedding);
  }

  private extractFrameEmbeddings(frames: number[][]): number[][] {
    // Simulate frame-level feature extraction
    // In real implementation, this would be the output of TDNN layers
    const embeddings: number[][] = [];

    for (let i = 0; i < frames.length; i++) {
      // Create frame embedding by combining mel features with temporal context
      const contextWindow = this.getContextWindow(frames, i, 5);
      const frameEmbedding = this.processContextWindow(contextWindow);
      embeddings.push(frameEmbedding);
    }

    return embeddings;
  }

  private getContextWindow(frames: number[][], centerIndex: number, windowSize: number): number[] {
    const context: number[] = [];
    const halfWindow = Math.floor(windowSize / 2);

    for (let i = -halfWindow; i <= halfWindow; i++) {
      const idx = Math.max(0, Math.min(frames.length - 1, centerIndex + i));
      context.push(...frames[idx]);
    }

    return context;
  }

  private processContextWindow(context: number[]): number[] {
    // Simulate processing with learned weights
    // Use deterministic hash-based weights for consistency
    const embeddingDim = 1500;
    const embedding: number[] = new Array(embeddingDim).fill(0);

    for (let i = 0; i < embeddingDim; i++) {
      let sum = 0;
      for (let j = 0; j < context.length; j++) {
        // Deterministic pseudo-random weight based on indices
        const weight = this.seededRandom(i * 10000 + j) * 2 - 1;
        sum += context[j] * weight;
      }
      embedding[i] = Math.tanh(sum / Math.sqrt(context.length));
    }

    return embedding;
  }

  private seededRandom(seed: number): number {
    // Simple seeded random number generator
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  private statisticalPooling(embeddings: number[][]): number[] {
    if (embeddings.length === 0) return new Array(3000).fill(0);

    const dim = embeddings[0].length;
    const mean = new Array(dim).fill(0);
    const std = new Array(dim).fill(0);

    // Calculate mean
    for (const emb of embeddings) {
      for (let i = 0; i < dim; i++) {
        mean[i] += emb[i];
      }
    }
    for (let i = 0; i < dim; i++) {
      mean[i] /= embeddings.length;
    }

    // Calculate std
    for (const emb of embeddings) {
      for (let i = 0; i < dim; i++) {
        std[i] += Math.pow(emb[i] - mean[i], 2);
      }
    }
    for (let i = 0; i < dim; i++) {
      std[i] = Math.sqrt(std[i] / embeddings.length);
    }

    // Concatenate mean and std
    return [...mean, ...std];
  }

  private projectToEmbedding(pooled: number[]): number[] {
    const embedding: number[] = new Array(this.config.embeddingDim).fill(0);

    for (let i = 0; i < this.config.embeddingDim; i++) {
      let sum = 0;
      for (let j = 0; j < pooled.length; j++) {
        const weight = this.seededRandom(i * 100000 + j + 50000) * 2 - 1;
        sum += pooled[j] * weight;
      }
      embedding[i] = Math.tanh(sum / Math.sqrt(pooled.length));
    }

    return embedding;
  }

  private l2Normalize(embedding: number[]): number[] {
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (norm === 0) return embedding;
    return embedding.map((val) => val / norm);
  }
}

// Global network instance
let embeddingNetwork: SpeakerEmbeddingNetwork | null = null;

function getNetwork(): SpeakerEmbeddingNetwork {
  if (!embeddingNetwork) {
    embeddingNetwork = new SpeakerEmbeddingNetwork();
  }
  return embeddingNetwork;
}

/**
 * Extract voiceprint embedding from audio data
 */
export function extractVoiceprint(
  audioData: Buffer,
  sourceSampleRate = 16000,
  bitDepth = 16,
): { embedding: number[]; quality: number } {
  // Preprocess audio
  const processedAudio = preprocessAudio(audioData, sourceSampleRate, bitDepth);

  // Calculate audio quality
  const qualityMetrics = calculateAudioQuality(processedAudio);

  // Extract voice activity segments
  const segments = extractVoiceActivity(processedAudio);

  if (segments.length === 0) {
    throw new Error("No voice activity detected in audio");
  }

  // Use the longest segment for embedding extraction
  const longestSegment = segments.reduce((max, seg) =>
    seg.end - seg.start > max.end - max.start ? seg : max,
  );

  const speechAudio = processedAudio.slice(longestSegment.start, longestSegment.end);

  // Compute mel spectrogram
  const melSpectrogram = computeMelSpectrogram(speechAudio);

  if (melSpectrogram.length === 0) {
    throw new Error("Failed to compute mel spectrogram");
  }

  // Extract embedding using neural network
  const network = getNetwork();
  const embedding = network.forward(melSpectrogram);

  // Calculate quality score based on audio metrics
  const quality = calculateEmbeddingQuality(qualityMetrics, segments.length);

  return { embedding, quality };
}

/**
 * Extract multiple embeddings from different segments for robustness
 */
export function extractMultipleVoiceprints(
  audioData: Buffer,
  sourceSampleRate = 16000,
  bitDepth = 16,
  minSegments = 3,
): Array<{ embedding: number[]; quality: number; segmentIndex: number }> {
  // Preprocess audio
  const processedAudio = preprocessAudio(audioData, sourceSampleRate, bitDepth);

  // Calculate audio quality
  const qualityMetrics = calculateAudioQuality(processedAudio);

  // Extract voice activity segments
  const segments = extractVoiceActivity(processedAudio);

  if (segments.length === 0) {
    throw new Error("No voice activity detected in audio");
  }

  // Sort segments by length (descending)
  const sortedSegments = segments.sort((a, b) => b.end - b.start - (a.end - a.start));

  const network = getNetwork();
  const embeddings: Array<{ embedding: number[]; quality: number; segmentIndex: number }> = [];

  // Extract embedding from each significant segment
  for (let i = 0; i < Math.min(sortedSegments.length, minSegments); i++) {
    const segment = sortedSegments[i];
    const segmentAudio = processedAudio.slice(segment.start, segment.end);

    // Skip very short segments
    if (segmentAudio.length < DEFAULT_AUDIO_OPTIONS.sampleRate * 0.5) {
      continue;
    }

    const melSpectrogram = computeMelSpectrogram(segmentAudio);
    if (melSpectrogram.length > 0) {
      const embedding = network.forward(melSpectrogram);
      const quality = calculateEmbeddingQuality(qualityMetrics, segments.length);
      embeddings.push({ embedding, quality, segmentIndex: i });
    }
  }

  return embeddings;
}

/**
 * Calculate embedding quality score
 */
function calculateEmbeddingQuality(
  metrics: { snr: number; duration: number; clippingRatio: number },
  numSegments: number,
): number {
  // SNR score: 0-1 (higher is better)
  const snrScore = Math.min(Math.max((metrics.snr + 10) / 30, 0), 1);

  // Duration score: 0-1 (optimal around 3-10 seconds)
  let durationScore = 0;
  if (metrics.duration >= 3 && metrics.duration <= 10) {
    durationScore = 1;
  } else if (metrics.duration < 3) {
    durationScore = metrics.duration / 3;
  } else {
    durationScore = Math.max(0, 1 - (metrics.duration - 10) / 10);
  }

  // Clipping penalty
  const clippingScore = Math.max(0, 1 - metrics.clippingRatio * 100);

  // Voice activity score
  const activityScore = Math.min(numSegments / 3, 1);

  // Combined quality score
  return snrScore * 0.3 + durationScore * 0.3 + clippingScore * 0.2 + activityScore * 0.2;
}

/**
 * Compare two embeddings using cosine similarity
 */
export function compareEmbeddings(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Embedding dimensions do not match");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Compare multiple embeddings and return average similarity
 */
export function compareMultipleEmbeddings(
  embeddingsA: number[][],
  embeddingsB: number[][],
): number {
  if (embeddingsA.length === 0 || embeddingsB.length === 0) {
    return 0;
  }

  let totalSimilarity = 0;
  let count = 0;

  for (const embA of embeddingsA) {
    for (const embB of embeddingsB) {
      totalSimilarity += compareEmbeddings(embA, embB);
      count++;
    }
  }

  return totalSimilarity / count;
}

/**
 * Calculate optimal threshold based on embedding statistics
 */
export function calculateOptimalThreshold(
  genuineScores: number[],
  impostorScores: number[],
): number {
  // Find threshold that maximizes F1 score
  let bestThreshold = 0.5;
  let bestF1 = 0;

  for (let threshold = 0.3; threshold <= 0.9; threshold += 0.01) {
    const tp = genuineScores.filter((s) => s >= threshold).length;
    const fn = genuineScores.filter((s) => s < threshold).length;
    const fp = impostorScores.filter((s) => s >= threshold).length;

    const precision = tp / (tp + fp) || 0;
    const recall = tp / (tp + fn) || 0;
    const f1 = (2 * precision * recall) / (precision + recall) || 0;

    if (f1 > bestF1) {
      bestF1 = f1;
      bestThreshold = threshold;
    }
  }

  return bestThreshold;
}
