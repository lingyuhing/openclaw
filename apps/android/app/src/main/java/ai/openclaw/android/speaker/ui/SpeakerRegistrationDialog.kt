package ai.openclaw.android.speaker.ui

import ai.openclaw.android.speaker.SpeakerRecognitionManager
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * Speaker registration dialog
 * Records audio samples for speaker enrollment
 */
@Composable
fun SpeakerRegistrationDialog(
    manager: SpeakerRecognitionManager,
    onDismiss: () -> Unit,
    onRegistered: (String) -> Unit
) {
    var isRecording by remember { mutableStateOf(false) }
    var recordedSamples by remember { mutableStateOf(0) }
    var isProcessing by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    AlertDialog(
        onDismissRequest = { if (!isRecording && !isProcessing) onDismiss() },
        title = { Text("Register New Speaker") },
        text = {
            Column(
                modifier = Modifier.fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                if (isProcessing) {
                    CircularProgressIndicator()
                    Spacer(modifier = Modifier.height(16.dp))
                    Text("Processing...")
                } else {
                    Text(
                        text = "Record 3-5 voice samples to register a new speaker",
                        style = MaterialTheme.typography.bodyMedium
                    )
                    Spacer(modifier = Modifier.height(16.dp))

                    // Recording indicator
                    if (isRecording) {
                        RecordingIndicator()
                    } else {
                        Text(
                            text = "Samples recorded: $recordedSamples/5",
                            style = MaterialTheme.typography.bodyLarge
                        )
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    // Record button
                    FilledIconButton(
                        onClick = {
                            if (isRecording) {
                                // Stop recording
                                isRecording = false
                                recordedSamples++
                            } else {
                                // Start recording
                                isRecording = true
                            }
                        },
                        modifier = Modifier.size(64.dp)
                    ) {
                        Icon(
                            imageVector = if (isRecording) Icons.Default.Stop else Icons.Default.Mic,
                            contentDescription = if (isRecording) "Stop recording" else "Start recording",
                            modifier = Modifier.size(32.dp)
                        )
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    Text(
                        text = if (isRecording) "Tap to stop" else "Tap to record",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    errorMessage?.let { error ->
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            text = error,
                            color = MaterialTheme.colorScheme.error,
                            style = MaterialTheme.typography.bodySmall
                        )
                    }
                }
            }
        },
        confirmButton = {
            TextButton(
                onClick = {
                    scope.launch {
                        isProcessing = true
                        try {
                            // TODO: Implement actual audio recording and enrollment
                            // For now, simulate enrollment
                            delay(2000)
                            onRegistered("spk_simulated_M")
                        } catch (e: Exception) {
                            errorMessage = e.message
                        } finally {
                            isProcessing = false
                        }
                    }
                },
                enabled = recordedSamples >= 3 && !isRecording && !isProcessing
            ) {
                Text("Register")
            }
        },
        dismissButton = {
            TextButton(
                onClick = onDismiss,
                enabled = !isRecording && !isProcessing
            ) {
                Text("Cancel")
            }
        }
    )
}

@Composable
private fun RecordingIndicator() {
    var visible by remember { mutableStateOf(true) }

    LaunchedEffect(Unit) {
        while (true) {
            delay(500)
            visible = !visible
        }
    }

    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Box(
            modifier = Modifier
                .size(12.dp)
                .let {
                    if (visible) {
                        it.padding(0.dp)
                    } else {
                        it.padding(2.dp)
                    }
                }
        ) {
            Surface(
                modifier = Modifier.fillMaxSize(),
                shape = androidx.compose.foundation.shape.CircleShape,
                color = MaterialTheme.colorScheme.error
            ) {}
        }
        Text(
            text = "Recording...",
            color = MaterialTheme.colorScheme.error,
            style = MaterialTheme.typography.bodyLarge
        )
    }
}
