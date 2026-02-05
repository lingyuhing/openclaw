/**
 * Message types for voice channel
 */

/**
 * Chat message with speaker ID
 */
export interface ChatMessage {
  /** Message content */
  content: string;
  /** Speaker ID */
  speakerId: string;
  /** Message channel */
  channel: string;
  /** Timestamp */
  timestamp: number;
}

/**
 * Message context for agent
 */
export interface MessageContext {
  content: string;
  metadata: {
    speakerId: string;
    channel: string;
    timestamp: number;
  };
}

/**
 * STT language setting
 */
export type SttLanguage = "zh" | "nan" | "auto";

/**
 * STT set language request
 */
export interface SttSetLanguageRequest {
  language: SttLanguage;
}

/**
 * STT set language response
 */
export interface SttSetLanguageResponse {
  success: boolean;
}

/**
 * STT language changed event
 */
export interface SttLanguageChangedEvent {
  language: SttLanguage;
  timestamp: number;
}

/**
 * Speaker identified event
 */
export interface SpeakerIdentifiedEvent {
  speakerId: string;
  confidence: number;
  timestamp: number;
}
