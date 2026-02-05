/**
 * Extension entry point
 * Registers Gateway methods for speaker recognition and Minnan STT
 */

import { createSpeakerHandlers } from "./handlers/speaker.handlers.js";
import { createSttHandlers } from "./handlers/stt.handlers.js";
import { SpeakerRecognitionService } from "./speaker/SpeakerRecognitionService.js";
import { NanSttService } from "./stt/NanSttService.js";

// Extension metadata
export const name = "voice-channel-speaker";
export const version = "1.0.0";

// Services
let speakerService: SpeakerRecognitionService | null = null;
let sttService: NanSttService | null = null;

/**
 * Initialize extension
 */
export async function initialize(api: {
  registerGatewayMethod: (method: string, handler: Function) => void;
  pushEvent: (event: string, payload: unknown) => void;
  config: Record<string, unknown>;
}): Promise<void> {
  // Initialize speaker recognition service
  speakerService = new SpeakerRecognitionService();
  await speakerService.initialize();

  // Initialize STT service
  const openaiApiKey = api.config["openaiApiKey"] as string | undefined;
  sttService = new NanSttService(openaiApiKey);

  // Create handlers
  const speakerHandlers = createSpeakerHandlers(speakerService);
  const sttHandlers = createSttHandlers(sttService);

  // Register Gateway methods
  api.registerGatewayMethod("speaker.enroll", speakerHandlers.enroll);
  api.registerGatewayMethod("speaker.enrollMulti", speakerHandlers.enrollMulti);
  api.registerGatewayMethod("speaker.identify", speakerHandlers.identify);
  api.registerGatewayMethod("speaker.identifyRealtime", speakerHandlers.identifyRealtime);
  api.registerGatewayMethod("speaker.verify", speakerHandlers.verify);
  api.registerGatewayMethod("speaker.list", speakerHandlers.list);
  api.registerGatewayMethod("speaker.get", speakerHandlers.get);
  api.registerGatewayMethod("speaker.delete", speakerHandlers.delete);
  api.registerGatewayMethod("speaker.stats", speakerHandlers.stats);
  api.registerGatewayMethod("speaker.setThreshold", speakerHandlers.setThreshold);

  api.registerGatewayMethod("stt.setLanguage", sttHandlers.setLanguage);
  api.registerGatewayMethod("stt.getLanguage", sttHandlers.getLanguage);
  api.registerGatewayMethod("stt.transcribe", sttHandlers.transcribe);

  console.log("[voice-channel-speaker] Extension initialized");
}

/**
 * Shutdown extension
 */
export async function shutdown(): Promise<void> {
  speakerService = null;
  sttService = null;
  console.log("[voice-channel-speaker] Extension shutdown");
}

// Re-export types
export * from "./types/speaker.types.js";
export * from "./types/message.types.js";

// Re-export services
export { SpeakerRecognitionService } from "./speaker/SpeakerRecognitionService.js";
export { NanSttService } from "./stt/NanSttService.js";
export { SpeakerIdGenerator } from "./speaker/SpeakerIdGenerator.js";
export { SpeakerRepository } from "./speaker/SpeakerRepository.js";

// Re-export audio processing utilities
export {
  preprocessAudio,
  computeMelSpectrogram,
  extractVoiceActivity,
  calculateAudioQuality,
} from "./audio/audio-preprocessing.js";

export {
  extractVoiceprint,
  extractMultipleVoiceprints,
  compareEmbeddings,
  compareMultipleEmbeddings,
} from "./audio/voiceprint-extractor.js";
