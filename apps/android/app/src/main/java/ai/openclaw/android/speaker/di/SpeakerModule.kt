package ai.openclaw.android.speaker.di

import ai.openclaw.android.gateway.GatewaySession
import ai.openclaw.android.speaker.SpeakerRecognitionManager
import ai.openclaw.android.speaker.SpeakerRepository

/**
 * Speaker module for dependency injection
 * Provides speaker recognition dependencies
 */
object SpeakerModule {
    private var gatewaySession: GatewaySession? = null
    private var recognitionManager: SpeakerRecognitionManager? = null
    private var repository: SpeakerRepository? = null

    /**
     * Initialize module with Gateway session
     */
    fun initialize(session: GatewaySession) {
        gatewaySession = session
    }

    /**
     * Get speaker recognition manager
     */
    fun provideSpeakerRecognitionManager(): SpeakerRecognitionManager {
        return recognitionManager ?: synchronized(this) {
            recognitionManager ?: SpeakerRecognitionManager(
                gatewaySession ?: throw IllegalStateException("SpeakerModule not initialized")
            ).also {
                recognitionManager = it
            }
        }
    }

    /**
     * Get speaker repository
     */
    fun provideSpeakerRepository(): SpeakerRepository {
        return repository ?: synchronized(this) {
            repository ?: SpeakerRepository(
                gatewaySession ?: throw IllegalStateException("SpeakerModule not initialized")
            ).also {
                repository = it
            }
        }
    }

    /**
     * Clear all instances (for testing)
     */
    fun clear() {
        recognitionManager = null
        repository = null
        gatewaySession = null
    }
}
