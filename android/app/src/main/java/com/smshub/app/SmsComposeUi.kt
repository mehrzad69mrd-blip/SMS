package com.smshub.app

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Send
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import java.text.SimpleDateFormat
import java.util.*

/**
 * Main application entry point for Compose UI.
 * Orchestrates navigation between the conversation list and the chat screen,
 * and manages permission states.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SmsApp(
    viewModel: SmsViewModel,
    hasPermissions: Boolean,
    onRequestPermissions: () -> Unit
) {
    val selectedThreadId by viewModel.selectedThreadId.collectAsState()
    var showComposeDialog by remember { mutableStateOf(false) }

    MaterialTheme(
        colorScheme = lightColorScheme(
            primary = Color(0xFF1E3A8A), // Elegant Navy Primary
            onPrimary = Color.White,
            primaryContainer = Color(0xFFDBEAFE),
            onPrimaryContainer = Color(0xFF1E40AF),
            secondary = Color(0xFF0F766E),
            onSecondary = Color.White,
            background = Color(0xFFF8FAFC), // Soft Slate Background
            surface = Color.White,
            onBackground = Color(0xFF0F172A),
            onSurface = Color(0xFF0F172A)
        )
    ) {
        Surface(
            modifier = Modifier.fillMaxSize(),
            color = MaterialTheme.colorScheme.background
        ) {
            if (!hasPermissions) {
                PermissionRequestScreen(onRequestPermissions)
            } else {
                LaunchedEffect(Unit) {
                    viewModel.loadConversations()
                }

                Box(modifier = Modifier.fillMaxSize()) {
                    if (selectedThreadId == null) {
                        ConversationListScreen(
                            viewModel = viewModel,
                            onThreadClick = { threadId ->
                                viewModel.selectThread(threadId)
                            },
                            onComposeClick = {
                                showComposeDialog = true
                            }
                        )
                    } else {
                        val conversationsState by viewModel.conversationsState.collectAsState()
                        var activeAddress = "Unknown"
                        if (conversationsState is ConversationsUiState.Success) {
                            val activeThread = (conversationsState as ConversationsUiState.Success)
                                .conversations.find { it.threadId == selectedThreadId }
                            if (activeThread != null) {
                                activeAddress = activeThread.address
                            }
                        }

                        ChatScreen(
                            viewModel = viewModel,
                            address = activeAddress,
                            onBackClick = {
                                viewModel.clearSelectedThread()
                            }
                        )
                    }

                    if (showComposeDialog) {
                        ComposeMessageDialog(
                            onDismiss = { showComposeDialog = false },
                            onSend = { address, body ->
                                viewModel.sendMessage(address, body)
                                showComposeDialog = false
                            }
                        )
                    }
                }
            }
        }
    }
}

/**
 * Fallback screen shown when SMS or Contact permissions are not yet granted.
 */
@Composable
fun PermissionRequestScreen(onRequestPermissions: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = "SMS Hub",
            style = MaterialTheme.typography.headlineMedium.copy(
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary
            )
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = "Access your conversations securely and respond instantly using native APIs.",
            style = MaterialTheme.typography.bodyMedium,
            color = Color.Gray,
            modifier = Modifier.padding(horizontal = 16.dp)
        )
        Spacer(modifier = Modifier.height(32.dp))
        Button(
            onClick = onRequestPermissions,
            shape = RoundedCornerShape(12.dp),
            contentPadding = PaddingValues(horizontal = 24.dp, vertical = 12.dp)
        ) {
            Text("Grant SMS Permissions", fontSize = 16.sp)
        }
    }
}

/**
 * Screen presenting a list of all active conversations.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ConversationListScreen(
    viewModel: SmsViewModel,
    onThreadClick: (Long) -> Unit,
    onComposeClick: () -> Unit
) {
    val state by viewModel.conversationsState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "Conversations",
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = onComposeClick,
                containerColor = MaterialTheme.colorScheme.primary,
                contentColor = MaterialTheme.colorScheme.onPrimary,
                shape = CircleShape
            ) {
                Icon(imageVector = Icons.Default.Add, contentDescription = "Compose Message")
            }
        }
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            when (val uiState = state) {
                is ConversationsUiState.Loading -> {
                    CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
                }
                is ConversationsUiState.Error -> {
                    Text(
                        text = "Error loading conversations: ${uiState.exception.localizedMessage}",
                        color = MaterialTheme.colorScheme.error,
                        modifier = Modifier
                            .align(Alignment.Center)
                            .padding(16.dp)
                    )
                }
                is ConversationsUiState.Success -> {
                    if (uiState.conversations.isEmpty()) {
                        Text(
                            text = "No conversations found",
                            color = Color.Gray,
                            modifier = Modifier.align(Alignment.Center)
                        )
                    } else {
                        LazyColumn(
                            modifier = Modifier.fillMaxSize(),
                            contentPadding = PaddingValues(bottom = 80.dp)
                        ) {
                            items(uiState.conversations) { message ->
                                ConversationItem(
                                    message = message,
                                    onClick = { onThreadClick(message.threadId) }
                                )
                            }
                        }
                    }
                }
                else -> {
                    // Idle state
                }
            }
        }
    }
}

/**
 * Individual conversation thread list item.
 */
@Composable
fun ConversationItem(
    message: SmsMessage,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 6.dp)
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Initial/Avatar Placeholder
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .background(
                        color = MaterialTheme.colorScheme.primaryContainer,
                        shape = CircleShape
                    ),
                contentAlignment = Alignment.Center
            ) {
                val initial = if (message.address.isNotEmpty()) {
                    message.address.take(1).uppercase()
                } else {
                    "?"
                }
                Text(
                    text = initial,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onPrimaryContainer,
                    fontSize = 18.sp
                )
            }

            Spacer(modifier = Modifier.width(16.dp))

            Column(modifier = Modifier.weight(1f)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = message.address,
                        fontWeight = if (!message.isRead) FontWeight.Bold else FontWeight.SemiBold,
                        fontSize = 16.sp,
                        color = MaterialTheme.colorScheme.onSurface,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Text(
                        text = formatTimestamp(message.timestamp),
                        fontSize = 12.sp,
                        color = Color.Gray
                    )
                }
                Spacer(modifier = Modifier.height(4.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = message.body,
                        style = MaterialTheme.typography.bodyMedium,
                        color = if (!message.isRead) MaterialTheme.colorScheme.onSurface else Color.Gray,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f)
                    )
                    if (!message.isRead) {
                        Box(
                            modifier = Modifier
                                .padding(start = 8.dp)
                                .size(10.dp)
                                .background(
                                    color = MaterialTheme.colorScheme.primary,
                                    shape = CircleShape
                                )
                        )
                    }
                }
            }
        }
    }
}

/**
 * Screen displaying the chat timeline with individual SMS speech bubbles and a composition bar.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatScreen(
    viewModel: SmsViewModel,
    address: String,
    onBackClick: () -> Unit
) {
    val state by viewModel.messagesState.collectAsState()
    var inputMessage by remember { mutableStateOf("") }
    val listState = rememberLazyListState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = address,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 18.sp
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(imageVector = Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        },
        bottomBar = {
            Surface(
                tonalElevation = 2.dp,
                modifier = Modifier.navigationBarsPadding()
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    TextField(
                        value = inputMessage,
                        onValueChange = { inputMessage = it },
                        placeholder = { Text("Text message") },
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(24.dp)),
                        colors = TextFieldDefaults.colors(
                            focusedIndicatorColor = Color.Transparent,
                            unfocusedIndicatorColor = Color.Transparent,
                            disabledIndicatorColor = Color.Transparent
                        ),
                        maxLines = 4
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    IconButton(
                        onClick = {
                            if (inputMessage.isNotBlank()) {
                                viewModel.sendMessage(address, inputMessage)
                                inputMessage = ""
                            }
                        },
                        colors = IconButtonDefaults.iconButtonColors(
                            containerColor = MaterialTheme.colorScheme.primary,
                            contentColor = MaterialTheme.colorScheme.onPrimary
                        ),
                        modifier = Modifier.size(48.dp)
                    ) {
                        Icon(imageVector = Icons.Default.Send, contentDescription = "Send SMS")
                    }
                }
            }
        }
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            when (val uiState = state) {
                is MessagesUiState.Loading -> {
                    CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
                }
                is MessagesUiState.Error -> {
                    Text(
                        text = "Error loading messages: ${uiState.exception.localizedMessage}",
                        color = MaterialTheme.colorScheme.error,
                        modifier = Modifier
                            .align(Alignment.Center)
                            .padding(16.dp)
                    )
                }
                is MessagesUiState.Success -> {
                    if (uiState.messages.isEmpty()) {
                        Text(
                            text = "No messages",
                            color = Color.Gray,
                            modifier = Modifier.align(Alignment.Center)
                        )
                    } else {
                        // Automatically scroll to the end of the chat
                        LaunchedEffect(uiState.messages.size) {
                            if (uiState.messages.isNotEmpty()) {
                                listState.animateScrollToItem(uiState.messages.size - 1)
                            }
                        }

                        LazyColumn(
                            state = listState,
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(horizontal = 16.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp),
                            contentPadding = PaddingValues(vertical = 16.dp)
                        ) {
                            items(uiState.messages) { msg ->
                                // Determine if the message is Sent or Received based on its SMS Type
                                val isSentByMe = msg.type == 2 // MESSAGE_TYPE_SENT
                                ChatBubble(message = msg, isSentByMe = isSentByMe)
                            }
                        }
                    }
                }
                else -> {
                    // Idle state
                }
            }
        }
    }
}

/**
 * Styled speech bubble representing an SMS message in the conversation thread.
 */
@Composable
fun ChatBubble(
    message: SmsMessage,
    isSentByMe: Boolean
) {
    val bubbleColor = if (isSentByMe) {
        MaterialTheme.colorScheme.primary
    } else {
        Color(0xFFE2E8F0) // Soft Gray for Received
    }

    val textColor = if (isSentByMe) {
        MaterialTheme.colorScheme.onPrimary
    } else {
        MaterialTheme.colorScheme.onSurface
    }

    val bubbleShape = if (isSentByMe) {
        RoundedCornerShape(16.dp, 16.dp, 0.dp, 16.dp)
    } else {
        RoundedCornerShape(16.dp, 16.dp, 16.dp, 0.dp)
    }

    val alignment = if (isSentByMe) Alignment.End else Alignment.Start

    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = alignment
    ) {
        Box(
            modifier = Modifier
                .widthIn(max = 280.dp)
                .background(color = bubbleColor, shape = bubbleShape)
                .padding(horizontal = 16.dp, vertical = 10.dp)
        ) {
            Text(
                text = message.body,
                color = textColor,
                fontSize = 15.sp
            )
        }
        Spacer(modifier = Modifier.height(2.dp))
        Text(
            text = formatDetailedTime(message.timestamp),
            fontSize = 10.sp,
            color = Color.Gray,
            modifier = Modifier.padding(horizontal = 4.dp)
        )
    }
}

/**
 * Overlay Dialog to type a custom phone number and message body to send a new SMS message.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ComposeMessageDialog(
    onDismiss: () -> Unit,
    onSend: (address: String, body: String) -> Unit
) {
    var address by remember { mutableStateOf("") }
    var body by remember { mutableStateOf("") }

    Dialog(onDismissRequest = onDismiss) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surface
            )
        ) {
            Column(
                modifier = Modifier
                    .padding(24.dp)
                    .fillMaxWidth()
            ) {
                Text(
                    text = "New Message",
                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                    color = MaterialTheme.colorScheme.onSurface
                )
                Spacer(modifier = Modifier.height(16.dp))

                OutlinedTextField(
                    value = address,
                    onValueChange = { address = it },
                    label = { Text("To (Phone number)") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = body,
                    onValueChange = { body = it },
                    label = { Text("Message") },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(120.dp),
                    maxLines = 5
                )
                Spacer(modifier = Modifier.height(24.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End
                ) {
                    TextButton(onClick = onDismiss) {
                        Text("Cancel")
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Button(
                        onClick = {
                            if (address.isNotBlank() && body.isNotBlank()) {
                                onSend(address, body)
                            }
                        },
                        enabled = address.isNotBlank() && body.isNotBlank()
                    ) {
                        Text("Send")
                    }
                }
            }
        }
    }
}

/**
 * Helper to display a relative date snippet (e.g. "Today", "Yesterday", or "MMM dd").
 */
private fun formatTimestamp(timestamp: Long): String {
    val date = Date(timestamp)
    val now = Calendar.getInstance()
    val msgTime = Calendar.getInstance().apply { time = date }

    return if (now.get(Calendar.YEAR) == msgTime.get(Calendar.YEAR)) {
        if (now.get(Calendar.DAY_OF_YEAR) == msgTime.get(Calendar.DAY_OF_YEAR)) {
            SimpleDateFormat("h:mm a", Locale.getDefault()).format(date)
        } else if (now.get(Calendar.DAY_OF_YEAR) - msgTime.get(Calendar.DAY_OF_YEAR) == 1) {
            "Yesterday"
        } else {
            SimpleDateFormat("MMM dd", Locale.getDefault()).format(date)
        }
    } else {
        SimpleDateFormat("MM/dd/yy", Locale.getDefault()).format(date)
    }
}

/**
 * Detailed timestamp format inside chat bubble.
 */
private fun formatDetailedTime(timestamp: Long): String {
    val date = Date(timestamp)
    return SimpleDateFormat("MMM d, h:mm a", Locale.getDefault()).format(date)
}
