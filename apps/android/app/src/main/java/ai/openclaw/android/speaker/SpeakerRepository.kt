package ai.openclaw.android.speaker

import ai.openclaw.android.gateway.GatewaySession
import ai.openclaw.android.speaker.model.SpeakerProfile
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow

/**
 * Speaker Repository
 * Manages speaker data operations
 */
class SpeakerRepository(
    private val gatewaySession: GatewaySession
) {
    /**
     * Get all registered speakers
     */
    fun getAllSpeakers(): Flow<List<SpeakerProfile>> = flow {
        // TODO: Implement with local database (Room)
        // For now, return empty list
        emit(emptyList())
    }

    /**
     * Get speaker by ID
     */
    suspend fun getSpeakerById(id: String): SpeakerProfile? {
        // TODO: Implement with local database
        return null
    }

    /**
     * Save speaker profile
     */
    suspend fun saveSpeaker(profile: SpeakerProfile) {
        // TODO: Implement with local database
    }

    /**
     * Delete speaker
     */
    suspend fun deleteSpeaker(id: String) {
        // TODO: Implement with local database
    }
}
