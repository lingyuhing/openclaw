package ai.openclaw.android.stt

/**
 * Speech recognition language settings
 */
enum class SttLanguage(val code: String) {
    ZH("zh"),           // Mandarin
    NAN("nan"),         // Minnan (Hokkien)
    AUTO("auto");       // Auto-detect

    companion object {
        fun fromCode(code: String): SttLanguage {
            return values().find { it.code == code } ?: ZH
        }
    }
}
