package ai.openclaw.android.speaker.ui

import ai.openclaw.android.speaker.SpeakerRecognitionManager
import ai.openclaw.android.speaker.model.SpeakerProfile
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch

/**
 * Speaker list screen
 * Displays all registered speakers
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SpeakerListScreen(
    manager: SpeakerRecognitionManager,
    onRegisterClick: () -> Unit,
    onBackClick: () -> Unit
) {
    val speakers by manager.registeredSpeakers.collectAsState()
    val scope = rememberCoroutineScope()
    var showDeleteDialog by remember { mutableStateOf<SpeakerProfile?>(null) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Speaker Management") },
                navigationIcon = {
                    TextButton(onClick = onBackClick) {
                        Text("Back")
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(onClick = onRegisterClick) {
                Icon(Icons.Default.Add, contentDescription = "Register new speaker")
            }
        }
    ) { padding ->
        if (speakers.isEmpty()) {
            EmptySpeakerList(
                modifier = Modifier.padding(padding),
                onRegisterClick = onRegisterClick
            )
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(speakers) { speaker ->
                    SpeakerCard(
                        speaker = speaker,
                        onDelete = { showDeleteDialog = speaker }
                    )
                }
            }
        }
    }

    // Delete confirmation dialog
    showDeleteDialog?.let { speaker ->
        AlertDialog(
            onDismissRequest = { showDeleteDialog = null },
            title = { Text("Delete Speaker") },
            text = { Text("Are you sure you want to delete this speaker?") },
            confirmButton = {
                TextButton(
                    onClick = {
                        scope.launch {
                            manager.deleteSpeaker(speaker.id)
                            showDeleteDialog = null
                        }
                    }
                ) {
                    Text("Delete", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteDialog = null }) {
                    Text("Cancel")
                }
            }
        )
    }
}

@Composable
private fun EmptySpeakerList(
    modifier: Modifier = Modifier,
    onRegisterClick: () -> Unit
) {
    Column(
        modifier = modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(
            imageVector = Icons.Default.Mic,
            contentDescription = null,
            modifier = Modifier.size(64.dp),
            tint = MaterialTheme.colorScheme.primary
        )
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            text = "No speakers registered",
            style = MaterialTheme.typography.titleMedium
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = "Tap + to register a new speaker",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@Composable
private fun SpeakerCard(
    speaker: SpeakerProfile,
    onDelete: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Mic,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary
                    )
                    Text(
                        text = speaker.id,
                        style = MaterialTheme.typography.titleMedium
                    )
                }
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "Confidence: ${(speaker.confidence * 100).toInt()}%",
                    style = MaterialTheme.typography.bodyMedium
                )
                Text(
                    text = "Registered: ${formatTimestamp(speaker.registeredAt)}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            IconButton(onClick = onDelete) {
                Icon(
                    imageVector = Icons.Default.Delete,
                    contentDescription = "Delete",
                    tint = MaterialTheme.colorScheme.error
                )
            }
        }
    }
}

private fun formatTimestamp(timestamp: Long): String {
    val sdf = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.getDefault())
    return sdf.format(java.util.Date(timestamp))
}
