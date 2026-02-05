/**
 * Audio preprocessing pipeline for voiceprint extraction
 * Includes noise reduction, normalization, and feature enhancement
 */

export interface AudioProcessingOptions {
  sampleRate: number;
  targetSampleRate: number;
  frameSize: number;
  hopLength: number;
  nMels: number;
  nFft: number;
}

export const DEFAULT_AUDIO_OPTIONS: AudioProcessingOptions = {
  sampleRate: 16000,
  targetSampleRate: 16000,
  frameSize: 512,
  hopLength: 256,
  nMels: 40,
  nFft: 512,
};

/**
 * Resample audio to target sample rate using linear interpolation
 */
export function resampleAudio(
  audioData: Float32Array,
  sourceRate: number,
  targetRate: number,
): Float32Array {
  if (sourceRate === targetRate) {
    return audioData;
  }

  const ratio = targetRate / sourceRate;
  const newLength = Math.floor(audioData.length * ratio);
  const result = new Float32Array(newLength);

  for (let i = 0; i < newLength; i++) {
    const srcIndex = i / ratio;
    const index = Math.floor(srcIndex);
    const fraction = srcIndex - index;

    if (index >= audioData.length - 1) {
      result[i] = audioData[audioData.length - 1];
    } else {
      result[i] = audioData[index] * (1 - fraction) + audioData[index + 1] * fraction;
    }
  }

  return result;
}

/**
 * Apply pre-emphasis filter to boost high frequencies
 * Formula: y[n] = x[n] - 0.97 * x[n-1]
 */
export function preEmphasis(audioData: Float32Array, coefficient = 0.97): Float32Array {
  const result = new Float32Array(audioData.length);
  result[0] = audioData[0];

  for (let i = 1; i < audioData.length; i++) {
    result[i] = audioData[i] - coefficient * audioData[i - 1];
  }

  return result;
}

/**
 * Apply simple noise gate to reduce background noise
 */
export function noiseGate(audioData: Float32Array, threshold = 0.01): Float32Array {
  const result = new Float32Array(audioData.length);

  for (let i = 0; i < audioData.length; i++) {
    const absVal = Math.abs(audioData[i]);
    if (absVal < threshold) {
      result[i] = 0;
    } else {
      result[i] = audioData[i];
    }
  }

  return result;
}

/**
 * Normalize audio to range [-1, 1]
 */
export function normalizeAudio(audioData: Float32Array): Float32Array {
  const maxAmp = Math.max(...Array.from(audioData).map(Math.abs));
  if (maxAmp === 0) return audioData;

  const result = new Float32Array(audioData.length);
  for (let i = 0; i < audioData.length; i++) {
    result[i] = audioData[i] / maxAmp;
  }

  return result;
}

/**
 * Apply Hamming window to audio frame
 */
export function applyHammingWindow(frame: Float32Array): Float32Array {
  const result = new Float32Array(frame.length);
  for (let i = 0; i < frame.length; i++) {
    const windowValue = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (frame.length - 1));
    result[i] = frame[i] * windowValue;
  }
  return result;
}

/**
 * Compute Short-Time Fourier Transform (STFT)
 */
export function computeSTFT(
  audioData: Float32Array,
  frameSize: number,
  hopLength: number,
): Float32Array[] {
  const numFrames = Math.floor((audioData.length - frameSize) / hopLength) + 1;
  const stft: Float32Array[] = [];

  for (let i = 0; i < numFrames; i++) {
    const start = i * hopLength;
    const frame = audioData.slice(start, start + frameSize);
    const windowedFrame = applyHammingWindow(frame);

    // Compute FFT using DIT-FFT algorithm
    const fftResult = computeFFT(windowedFrame);
    stft.push(fftResult);
  }

  return stft;
}

/**
 * Simple FFT implementation using Cooley-Tukey algorithm
 */
function computeFFT(signal: Float32Array): Float32Array {
  const n = signal.length;
  if (n <= 1) return signal;

  // Pad to power of 2
  const paddedLength = Math.pow(2, Math.ceil(Math.log2(n)));
  const paddedSignal = new Float32Array(paddedLength);
  paddedSignal.set(signal);

  const result = new Float32Array(paddedLength * 2); // Complex numbers: [real, imag, real, imag, ...]

  // Copy real values
  for (let i = 0; i < paddedLength; i++) {
    result[i * 2] = paddedSignal[i];
    result[i * 2 + 1] = 0;
  }

  // Bit-reverse permutation
  let j = 0;
  for (let i = 0; i < paddedLength; i++) {
    if (i < j) {
      const tempReal = result[i * 2];
      const tempImag = result[i * 2 + 1];
      result[i * 2] = result[j * 2];
      result[i * 2 + 1] = result[j * 2 + 1];
      result[j * 2] = tempReal;
      result[j * 2 + 1] = tempImag;
    }
    let k = paddedLength >> 1;
    while (k & j) {
      j ^= k;
      k >>= 1;
    }
    j |= k;
  }

  // FFT computation
  for (let len = 2; len <= paddedLength; len <<= 1) {
    const angle = (-2 * Math.PI) / len;
    const wlenReal = Math.cos(angle);
    const wlenImag = Math.sin(angle);

    for (let i = 0; i < paddedLength; i += len) {
      let wReal = 1;
      let wImag = 0;

      for (let k = 0; k < len / 2; k++) {
        const uReal = result[(i + k) * 2];
        const uImag = result[(i + k) * 2 + 1];
        const vReal =
          result[(i + k + len / 2) * 2] * wReal - result[(i + k + len / 2) * 2 + 1] * wImag;
        const vImag =
          result[(i + k + len / 2) * 2] * wImag + result[(i + k + len / 2) * 2 + 1] * wReal;

        result[(i + k) * 2] = uReal + vReal;
        result[(i + k) * 2 + 1] = uImag + vImag;
        result[(i + k + len / 2) * 2] = uReal - vReal;
        result[(i + k + len / 2) * 2 + 1] = uImag - vImag;

        const nextWReal = wReal * wlenReal - wImag * wlenImag;
        wImag = wReal * wlenImag + wImag * wlenReal;
        wReal = nextWReal;
      }
    }
  }

  // Compute magnitude spectrum
  const magnitude = new Float32Array(paddedLength / 2 + 1);
  for (let i = 0; i < magnitude.length; i++) {
    const real = result[i * 2];
    const imag = result[i * 2 + 1];
    magnitude[i] = Math.sqrt(real * real + imag * imag);
  }

  return magnitude;
}

/**
 * Compute Mel-frequency filterbank
 */
export function createMelFilterbank(
  nFft: number,
  nMels: number,
  sampleRate: number,
  fMin = 0,
  fMax: number | null = null,
): number[][] {
  const fMaxFreq = fMax || sampleRate / 2;
  const fftFreqs = new Float32Array(nFft / 2 + 1);

  for (let i = 0; i < fftFreqs.length; i++) {
    fftFreqs[i] = (i * sampleRate) / nFft;
  }

  const melMin = hzToMel(fMin);
  const melMax = hzToMel(fMaxFreq);
  const melPoints = new Float32Array(nMels + 2);

  for (let i = 0; i < melPoints.length; i++) {
    melPoints[i] = melMin + (i * (melMax - melMin)) / (nMels + 1);
  }

  const freqPoints = melPoints.map(melToHz);
  const filterbank: number[][] = [];

  for (let i = 0; i < nMels; i++) {
    const filter: number[] = new Array(fftFreqs.length).fill(0);
    const fLeft = freqPoints[i];
    const fCenter = freqPoints[i + 1];
    const fRight = freqPoints[i + 2];

    for (let j = 0; j < fftFreqs.length; j++) {
      const freq = fftFreqs[j];
      if (freq >= fLeft && freq <= fCenter) {
        filter[j] = (freq - fLeft) / (fCenter - fLeft);
      } else if (freq > fCenter && freq <= fRight) {
        filter[j] = (fRight - freq) / (fRight - fCenter);
      }
    }

    filterbank.push(filter);
  }

  return filterbank;
}

/**
 * Convert Hz to Mel scale
 */
function hzToMel(hz: number): number {
  return 2595 * Math.log10(1 + hz / 700);
}

/**
 * Convert Mel to Hz
 */
function melToHz(mel: number): number {
  return 700 * (Math.pow(10, mel / 2595) - 1);
}

/**
 * Compute Mel-frequency spectrogram
 */
export function computeMelSpectrogram(
  audioData: Float32Array,
  options: Partial<AudioProcessingOptions> = {},
): number[][] {
  const opts = { ...DEFAULT_AUDIO_OPTIONS, ...options };

  // Compute STFT
  const stft = computeSTFT(audioData, opts.frameSize, opts.hopLength);

  // Create Mel filterbank
  const melFilterbank = createMelFilterbank(opts.nFft, opts.nMels, opts.sampleRate);

  // Apply Mel filterbank to each frame
  const melSpectrogram: number[][] = [];

  for (const frame of stft) {
    const melFrame: number[] = [];
    for (let i = 0; i < opts.nMels; i++) {
      let sum = 0;
      for (let j = 0; j < frame.length; j++) {
        sum += frame[j] * melFilterbank[i][j];
      }
      // Apply log compression
      melFrame.push(Math.log(sum + 1e-10));
    }
    melSpectrogram.push(melFrame);
  }

  return melSpectrogram;
}

/**
 * Convert various audio formats to Float32Array
 */
export function convertToFloat32Array(audioData: Buffer, bitDepth = 16): Float32Array {
  const result = new Float32Array(audioData.length / (bitDepth / 8));

  if (bitDepth === 16) {
    for (let i = 0; i < result.length; i++) {
      const sample = audioData.readInt16LE(i * 2);
      result[i] = sample / 32768.0; // Normalize to [-1, 1]
    }
  } else if (bitDepth === 32) {
    for (let i = 0; i < result.length; i++) {
      const sample = audioData.readFloatLE(i * 4);
      result[i] = sample;
    }
  }

  return result;
}

/**
 * Main audio preprocessing pipeline
 */
export function preprocessAudio(
  audioData: Buffer,
  sourceSampleRate = 16000,
  bitDepth = 16,
): Float32Array {
  // Convert to Float32Array
  let floatData = convertToFloat32Array(audioData, bitDepth);

  // Resample if needed
  if (sourceSampleRate !== DEFAULT_AUDIO_OPTIONS.targetSampleRate) {
    floatData = resampleAudio(floatData, sourceSampleRate, DEFAULT_AUDIO_OPTIONS.targetSampleRate);
  }

  // Apply pre-emphasis
  floatData = preEmphasis(floatData);

  // Apply noise gate
  floatData = noiseGate(floatData);

  // Normalize
  floatData = normalizeAudio(floatData);

  return floatData;
}

/**
 * Extract voice activity segments
 */
export function extractVoiceActivity(
  audioData: Float32Array,
  frameSize = 512,
  hopLength = 256,
  energyThreshold = 0.01,
): Array<{ start: number; end: number }> {
  const segments: Array<{ start: number; end: number }> = [];
  const numFrames = Math.floor((audioData.length - frameSize) / hopLength) + 1;

  let inSpeech = false;
  let segmentStart = 0;

  for (let i = 0; i < numFrames; i++) {
    const start = i * hopLength;
    const frame = audioData.slice(start, start + frameSize);

    // Calculate frame energy
    let energy = 0;
    for (let j = 0; j < frame.length; j++) {
      energy += frame[j] * frame[j];
    }
    energy = Math.sqrt(energy / frame.length);

    if (energy > energyThreshold && !inSpeech) {
      inSpeech = true;
      segmentStart = start;
    } else if (energy <= energyThreshold && inSpeech) {
      inSpeech = false;
      segments.push({
        start: segmentStart,
        end: start + frameSize,
      });
    }
  }

  // Close last segment if still in speech
  if (inSpeech) {
    segments.push({
      start: segmentStart,
      end: audioData.length,
    });
  }

  return segments;
}

/**
 * Calculate audio quality metrics
 */
export function calculateAudioQuality(audioData: Float32Array): {
  snr: number;
  duration: number;
  clippingRatio: number;
} {
  // Calculate signal power
  let signalPower = 0;
  let noisePower = 0;
  let clippingCount = 0;

  for (let i = 0; i < audioData.length; i++) {
    const sample = audioData[i];
    signalPower += sample * sample;

    // Simple noise estimation: samples near zero
    if (Math.abs(sample) < 0.01) {
      noisePower += sample * sample;
    }

    // Check for clipping
    if (Math.abs(sample) > 0.99) {
      clippingCount++;
    }
  }

  signalPower /= audioData.length;
  noisePower = Math.max(noisePower / audioData.length, 1e-10);

  const snr = 10 * Math.log10(signalPower / noisePower);
  const duration = audioData.length / DEFAULT_AUDIO_OPTIONS.sampleRate;
  const clippingRatio = clippingCount / audioData.length;

  return {
    snr,
    duration,
    clippingRatio,
  };
}
