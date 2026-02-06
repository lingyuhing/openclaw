/**
 * Parsers for STT provider diarization responses
 */

export {
  parseDeepgramDiarizationResponse,
  buildDeepgramDiarizationQuery,
} from "./deepgram-parser.js";

export { parseGoogleDiarizationResponse, buildGoogleDiarizationConfig } from "./google-parser.js";
