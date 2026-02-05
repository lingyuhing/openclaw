package ai.openclaw.android.speaker.model

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Speaker profile (local cache)
 * Only stores ID and metadata, not voiceprint features
 */
@Entity(tableName = "speaker_profiles")
data class SpeakerProfile(
    @PrimaryKey
    val id: String,              // Speaker ID
    val hash: String,            // Hash value
    val gender: String?,         // Gender
    val confidence: Float,       // Confidence at registration
    val registeredAt: Long,      // Registration time
    val lastIdentifiedAt: Long?  // Last identification time
)
