package ai.openclaw.android.speaker

import ai.openclaw.android.gateway.GatewaySession
import ai.openclaw.android.speaker.model.SpeakerId
import ai.openclaw.android.speaker.model.SpeakerProfile
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

/**
 * Speaker recognition result
 */
data class SpeakerRecognitionResult(
    val speakerId: String,
    val confidence: Float,
    val isKnown: Boolean
)

/**
 * Speaker Recognition Manager
 * Manages speaker enrollment and identification via Gateway
 */
class SpeakerRecognitionManager(
    private val gatewaySession: GatewaySession
) {
    private val json = Json { ignoreUnknownKeys = true }

    private val _registeredSpeakers = MutableStateFlow<List<SpeakerProfile>>(emptyList())
    val registeredSpeakers: StateFlow<List<SpeakerProfile>> = _registeredSpeakers

    private val _currentSpeaker = MutableStateFlow<SpeakerRecognitionResult?>(null)
    val currentSpeaker: StateFlow<SpeakerRecognitionResult?> = _currentSpeaker

    /**
     * Enroll a new speaker
     * @param audioData Audio data as ByteArray
     * @param gender Optional gender hint (M/F/U)
     * @return Enrollment result with speaker ID
     */
    suspend fun enroll(audioData: ByteArray, gender: String? = null): Result<SpeakerId> {
        return try {
            val base64Audio = android.util.Base64.encodeToString(audioData, android.util.Base64.NO_WRAP)

            val params = buildJsonObject {
                put("audioData", base64Audio)
                gender?.let { put("gender", it) }
            }

            val response = gatewaySession.request("speaker.enroll", params.toString())
            val jsonResponse = json.parseToJsonElement(response).jsonObject

            val speakerId = jsonResponse["speakerId"]?.jsonPrimitive?.content
                ?: return Result.failure(IllegalStateException("Missing speakerId in response"))
            val hash = jsonResponse["hash"]?.jsonPrimitive?.content ?: ""
            val confidence = jsonResponse["confidence"]?.jsonPrimitive?.content?.toFloatOrNull() ?: 0f

            val speaker = SpeakerId(
                id = speakerId,
                hash = hash,
                gender = gender,
                registeredAt = System.currentTimeMillis()
            )

            // Refresh speaker list
            loadSpeakers()

            Result.success(speaker)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Identify speaker from audio
     * @param audioData Audio data as ByteArray
     * @param threshold Recognition threshold (default 0.8)
     * @return Recognition result
     */
    suspend fun identify(audioData: ByteArray, threshold: Float = 0.8f): Result<SpeakerRecognitionResult> {
        return try {
            val base64Audio = android.util.Base64.encodeToString(audioData, android.util.Base64.NO_WRAP)

            val params = buildJsonObject {
                put("audioData", base64Audio)
                put("threshold", threshold)
            }

            val response = gatewaySession.request("speaker.identify", params.toString())
            val jsonResponse = json.parseToJsonElement(response).jsonObject

            val speakerId = jsonResponse["speakerId"]?.jsonPrimitive?.content
                ?: return Result.failure(IllegalStateException("Missing speakerId in response"))
            val confidence = jsonResponse["confidence"]?.jsonPrimitive?.content?.toFloatOrNull() ?: 0f
            val isKnown = jsonResponse["isKnown"]?.jsonPrimitive?.content?.toBooleanStrictOrNull() ?: false

            val result = SpeakerRecognitionResult(
                speakerId = speakerId,
                confidence = confidence,
                isKnown = isKnown
            )

            _currentSpeaker.value = result

            Result.success(result)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Load all registered speakers
     */
    suspend fun loadSpeakers(): Result<List<SpeakerProfile>> {
        return try {
            val response = gatewaySession.request("speaker.list", "{}")
            val jsonResponse = json.parseToJsonElement(response).jsonObject

            val speakersArray = jsonResponse["speakers"]
            val profiles = mutableListOf<SpeakerProfile>()

            // Parse speakers from response
            // Note: Actual parsing depends on the response structure
            // This is a simplified version

            _registeredSpeakers.value = profiles
            Result.success(profiles)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Delete a speaker
     */
    suspend fun deleteSpeaker(speakerId: String): Result<Boolean> {
        return try {
            val params = buildJsonObject {
                put("speakerId", speakerId)
            }

            val response = gatewaySession.request("speaker.delete", params.toString())
            val jsonResponse = json.parseToJsonElement(response).jsonObject

            val success = jsonResponse["success"]?.jsonPrimitive?.content?.toBooleanStrictOrNull() ?: false

            if (success) {
                loadSpeakers()
            }

            Result.success(success)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Get speaker display name
     * Returns a user-friendly name for the speaker
     */
    fun getSpeakerDisplayName(speakerId: String): String {
        return when {
            SpeakerId.isUnknown(speakerId) -> "Unknown Speaker"
            SpeakerId.isValid(speakerId) -> {
                // Extract hash and gender for display
                val parts = speakerId.split("_")
                val hash = parts.getOrNull(1) ?: "????"
                val gender = parts.getOrNull(2) ?: "U"
                val genderDisplay = when (gender) {
                    "M" -> "Male"
                    "F" -> "Female"
                    else -> "Unknown"
                }
                "Speaker $hash ($genderDisplay)"
            }
            else -> "Unknown"
        }
    }
}
