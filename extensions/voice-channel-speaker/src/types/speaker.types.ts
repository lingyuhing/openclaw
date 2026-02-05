/**
 * Speaker recognition types for Gateway Extension
 */

/**
 * Speaker embedding (voiceprint feature vector)
 * Stored in Gateway
 */
export interface SpeakerEmbedding {
  /** Speaker ID */
  id: string;
  /** Feature hash */
  hash: string;
  /** Voiceprint feature vector (averaged) */
  embedding: number[];
  /** Multiple voiceprint embeddings for robust matching */
  embeddings?: number[][];
  /** Gender: M/F/U */
  gender?: "M" | "F" | "U";
  /** Creation timestamp */
  createdAt: number;
  /** Update timestamp */
  updatedAt: number;
  /** Number of enrollment samples */
  enrollmentCount?: number;
}

/**
 * Speaker identification result
 */
export interface SpeakerIdentificationResult {
  /** Recognized speaker ID */
  speakerId: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Whether the speaker is known */
  isKnown: boolean;
  /** Audio quality score */
  quality?: number;
  /** Matching method used */
  matchMethod?: string;
  /** Best match ID (for unknown speakers) */
  bestMatchId?: string;
}

/**
 * Speaker enrollment request
 */
export interface SpeakerEnrollmentRequest {
  /** Base64 encoded audio data */
  audioData: string;
  /** Optional gender hint */
  gender?: "M" | "F" | "U";
  /** Sample rate in Hz (default: 16000) */
  sampleRate?: number;
  /** Bit depth (default: 16) */
  bitDepth?: number;
}

/**
 * Enrollment sample for multi-sample enrollment
 */
export interface EnrollmentSample {
  /** Base64 encoded audio data */
  audioData: string;
  /** Sample rate in Hz */
  sampleRate?: number;
  /** Bit depth */
  bitDepth?: number;
}

/**
 * Multi-sample speaker enrollment request
 */
export interface MultiSampleEnrollmentRequest {
  /** Multiple audio samples from the same speaker */
  samples: EnrollmentSample[];
  /** Optional gender hint */
  gender?: "M" | "F" | "U";
}

/**
 * Enrollment quality report
 */
export interface EnrollmentQualityReport {
  qualityReport?: {
    /** Average quality across all samples */
    averageQuality: number;
    /** Minimum quality score */
    minQuality: number;
    /** Consistency score between samples */
    consistencyScore: number;
    /** Number of samples processed */
    sampleCount: number;
    /** Details for each sample */
    sampleDetails: Array<{
      index: number;
      quality: number;
      duration: number;
    }>;
    /** Recommendations for improving enrollment */
    recommendations: string[];
  };
}

/**
 * Speaker enrollment response
 */
export interface SpeakerEnrollmentResponse {
  /** Generated speaker ID */
  speakerId: string;
  /** Voiceprint hash */
  hash: string;
  /** Enrollment quality confidence */
  confidence: number;
  /** Whether this was an update to existing speaker */
  isUpdate?: boolean;
  /** Number of enrollment samples */
  enrollmentCount?: number;
}

/**
 * Real-time identification request options
 */
export interface RealtimeIdentificationOptions {
  /** Window size in samples (default: 2 seconds at 16kHz) */
  windowSize?: number;
  /** Hop size between windows (default: 0.5 seconds) */
  hopSize?: number;
  /** Minimum confidence for identification */
  minConfidence?: number;
  /** Number of frames for smoothing */
  smoothingWindow?: number;
}

/**
 * Streaming identification result
 */
export interface StreamingIdentificationResult {
  /** Recognized speaker ID (null if not confident enough) */
  speakerId: string | null;
  /** Confidence score */
  confidence: number;
  /** Whether speaker is known */
  isKnown: boolean;
  /** Whether still processing */
  isProcessing: boolean;
  /** Number of buffered samples */
  bufferedSamples: number;
}

/**
 * Real-time identification request
 */
export interface SpeakerIdentificationRequest {
  /** Base64 encoded audio data */
  audioData: string;
  /** Recognition threshold (default 0.75) */
  threshold?: number;
  /** Sample rate in Hz (default: 16000) */
  sampleRate?: number;
  /** Bit depth (default: 16) */
  bitDepth?: number;
}

/**
 * Speaker verification request (1:1 comparison)
 */
export interface SpeakerVerificationRequest {
  /** Speaker ID to verify against */
  speakerId: string;
  /** Base64 encoded audio data */
  audioData: string;
  /** Verification threshold (default: 0.85) */
  threshold?: number;
  /** Sample rate in Hz */
  sampleRate?: number;
  /** Bit depth */
  bitDepth?: number;
}

/**
 * Speaker verification result
 */
export interface SpeakerVerificationResult {
  /** Speaker ID that was verified */
  speakerId: string;
  /** Whether verification passed */
  isVerified: boolean;
  /** Overall confidence score */
  confidence: number;
  /** Maximum similarity score */
  maxSimilarity?: number;
  /** Average similarity score */
  averageSimilarity?: number;
  /** Reason for failure if not verified */
  reason?: string;
}

/**
 * Speaker info (for listing)
 */
export interface SpeakerInfo {
  id: string;
  hash: string;
  gender?: "M" | "F" | "U";
  createdAt: number;
  updatedAt: number;
  enrollmentCount?: number;
}

/**
 * Speaker list response
 */
export interface SpeakerListResponse {
  speakers: SpeakerInfo[];
  totalCount: number;
}

/**
 * Delete speaker request
 */
export interface SpeakerDeleteRequest {
  speakerId: string;
}

/**
 * Delete speaker response
 */
export interface SpeakerDeleteResponse {
  success: boolean;
}

/**
 * Speaker recognition configuration
 */
export interface SpeakerRecognitionConfig {
  /** Minimum confidence threshold for identification */
  minConfidenceThreshold: number;
  /** High confidence threshold for verification */
  highConfidenceThreshold: number;
  /** Minimum enrollment samples required */
  minEnrollmentSamples: number;
  /** Maximum enrollment samples allowed */
  maxEnrollmentSamples: number;
  /** Minimum sample duration in seconds */
  minSampleDuration: number;
  /** Maximum sample duration in seconds */
  maxSampleDuration: number;
}

/**
 * Recognition statistics
 */
export interface RecognitionStats {
  /** Total number of enrolled speakers */
  totalSpeakers: number;
  /** Total number of stored embeddings */
  totalEmbeddings: number;
  /** Average embeddings per speaker */
  averageEmbeddingsPerSpeaker: number;
  /** Current identification threshold */
  currentThreshold: number;
}
