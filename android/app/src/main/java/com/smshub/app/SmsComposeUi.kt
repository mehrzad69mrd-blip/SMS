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
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.unit.LayoutDirection
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
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
    var showSettings by remember { mutableStateOf(false) }

    // System Back Press & Gesture Interceptor
    BackHandler(enabled = showSettings) {
        showSettings = false
    }

    BackHandler(enabled = selectedThreadId != null) {
        viewModel.clearSelectedThread()
    }

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
        // Enforce RTL Layout Direction for complete Persian support
        CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl) {
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
                        if (showSettings) {
                            SettingsScreen(
                                viewModel = viewModel,
                                onBackClick = { showSettings = false }
                            )
                        } else if (selectedThreadId == null) {
                            ConversationListScreen(
                                viewModel = viewModel,
                                onThreadClick = { threadId ->
                                    viewModel.selectThread(threadId)
                                },
                                onComposeClick = {
                                    showComposeDialog = true
                                },
                                onSettingsClick = {
                                    showSettings = true
                                }
                            )
                        } else {
                            val conversationsState by viewModel.conversationsState.collectAsState()
                            var activeAddress = "ناشناس"
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
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = "مرکز پیامک هوشمند",
            style = MaterialTheme.typography.headlineMedium.copy(
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary
            )
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = "به صورت امن به گفتگوها و پیام‌های خود دسترسی داشته باشید و فورا پاسخ دهید.",
            style = MaterialTheme.typography.bodyMedium,
            color = Color.Gray,
            modifier = Modifier.padding(horizontal = 16.dp),
            lineHeight = 22.sp
        )
        Spacer(modifier = Modifier.height(32.dp))
        Button(
            onClick = onRequestPermissions,
            shape = RoundedCornerShape(12.dp),
            contentPadding = PaddingValues(horizontal = 24.dp, vertical = 12.dp)
        ) {
            Text("اعطای مجوزهای پیامک", fontSize = 16.sp)
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
    onComposeClick: () -> Unit,
    onSettingsClick: () -> Unit
) {
    val state by viewModel.filteredConversations.collectAsState()
    val fullState by viewModel.conversationsState.collectAsState()
    val selectedCategory by viewModel.selectedCategory.collectAsState()

    val categoryCounts = remember(fullState) {
        val counts = mutableMapOf<SmsCategory, Int>()
        if (fullState is ConversationsUiState.Success) {
            val conversations = (fullState as ConversationsUiState.Success).conversations
            counts[SmsCategory.ALL] = conversations.size
            
            val categorized = conversations.groupBy { SmsCategorizer.categorize(it.address, it.body) }
            SmsCategory.values().forEach { cat ->
                if (cat != SmsCategory.ALL) {
                    counts[cat] = categorized[cat]?.size ?: 0
                }
            }
        } else {
            SmsCategory.values().forEach { counts[it] = 0 }
        }
        counts
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "پیام‌ها",
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                },
                actions = {
                    IconButton(onClick = onSettingsClick) {
                        Icon(imageVector = Icons.Default.Settings, contentDescription = "تنظیمات")
                    }
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
                Icon(imageVector = Icons.Default.Add, contentDescription = "پیام جدید")
            }
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            // Floating Narrow Capsule Category Bar (Telegram Style)
            FloatingCapsuleCategoryBar(
                selectedCategory = selectedCategory,
                categoryCounts = categoryCounts,
                onCategorySelected = { category ->
                    viewModel.selectCategory(category)
                }
            )

            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .weight(1f)
            ) {
                when (val uiState = state) {
                    is ConversationsUiState.Loading -> {
                        CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
                    }
                    is ConversationsUiState.Error -> {
                        Text(
                            text = "خطا در بارگذاری گفتگوها: ${uiState.exception.localizedMessage}",
                            color = MaterialTheme.colorScheme.error,
                            modifier = Modifier
                                .align(Alignment.Center)
                                .padding(16.dp)
                        )
                    }
                    is ConversationsUiState.Success -> {
                        if (uiState.conversations.isEmpty()) {
                            Text(
                                text = "هیچ گفتگویی در این دسته‌بندی یافت نشد",
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
}

/**
 * A sleek Jetpack Compose component presenting a list of category tabs
 * styled as modern floating narrow capsules (Telegram-style bar).
 */
@Composable
fun FloatingCapsuleCategoryBar(
    selectedCategory: SmsCategory,
    categoryCounts: Map<SmsCategory, Int>,
    onCategorySelected: (SmsCategory) -> Unit
) {
    val categories = SmsCategory.values()
    val scrollState = rememberScrollState()

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(scrollState)
            .padding(horizontal = 16.dp, vertical = 10.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        categories.forEach { category ->
            val isSelected = category == selectedCategory
            val count = categoryCounts[category] ?: 0
            val displayName = when (category) {
                SmsCategory.ALL -> "همه"
                SmsCategory.PERSONAL -> "شخصی"
                SmsCategory.BANK -> "بانکی"
                SmsCategory.OTP -> "رمز پویا"
                SmsCategory.PROMOTIONAL -> "تبلیغاتی"
            }

            val backgroundColor = if (isSelected) {
                MaterialTheme.colorScheme.primary
            } else {
                MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f)
            }
            val textColor = if (isSelected) {
                MaterialTheme.colorScheme.onPrimary
            } else {
                MaterialTheme.colorScheme.onSurfaceVariant
            }

            val badgeBgColor = if (isSelected) {
                MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.25f)
            } else {
                MaterialTheme.colorScheme.primary.copy(alpha = 0.12f)
            }
            val badgeTextColor = if (isSelected) {
                MaterialTheme.colorScheme.onPrimary
            } else {
                MaterialTheme.colorScheme.primary
            }

            Row(
                modifier = Modifier
                    .clip(RoundedCornerShape(24.dp))
                    .background(backgroundColor)
                    .clickable { onCategorySelected(category) }
                    .padding(horizontal = 12.dp, vertical = 7.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Text(
                    text = displayName,
                    color = textColor,
                    fontSize = 13.sp,
                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium
                )
                Box(
                    modifier = Modifier
                        .clip(CircleShape)
                        .background(badgeBgColor)
                        .padding(horizontal = 6.dp, vertical = 2.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = JalaliCalendarHelper.convertToPersianDigits(count.toString()),
                        color = badgeTextColor,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold
                    )
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
                    "؟"
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
                        text = JalaliCalendarHelper.formatTimestamp(message.timestamp),
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
                        Icon(imageVector = Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "برگشت")
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
                        placeholder = { Text("پیام متنی") },
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
                        Icon(imageVector = Icons.AutoMirrored.Filled.Send, contentDescription = "ارسال")
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
                        text = "خطا در بارگذاری پیام‌ها: ${uiState.exception.localizedMessage}",
                        color = MaterialTheme.colorScheme.error,
                        modifier = Modifier
                            .align(Alignment.Center)
                            .padding(16.dp)
                    )
                }
                is MessagesUiState.Success -> {
                    if (uiState.messages.isEmpty()) {
                        Text(
                            text = "هیچ پیامی وجود ندارد",
                            color = Color.Gray,
                            modifier = Modifier.align(Alignment.Center)
                        )
                    } else {
                        LazyColumn(
                            state = listState,
                            reverseLayout = true,
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(horizontal = 16.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp),
                            contentPadding = PaddingValues(vertical = 16.dp)
                        ) {
                            items(uiState.messages.reversed()) { msg ->
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
            text = JalaliCalendarHelper.formatDetailedTime(message.timestamp),
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
                    text = "پیام جدید",
                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                    color = MaterialTheme.colorScheme.onSurface
                )
                Spacer(modifier = Modifier.height(16.dp))

                OutlinedTextField(
                    value = address,
                    onValueChange = { address = it },
                    label = { Text("به (شماره تلفن)") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = body,
                    onValueChange = { body = it },
                    label = { Text("متن پیام") },
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
                        Text("لغو")
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
                        Text("ارسال")
                    }
                }
            }
        }
    }
}

/**
 * Full page-like Settings view.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    viewModel: SmsViewModel,
    onBackClick: () -> Unit
) {
    val deliveryReports by viewModel.deliveryReports.collectAsState()
    val readReceipts by viewModel.readReceipts.collectAsState()
    val autoDeleteOld by viewModel.autoDeleteOld.collectAsState()
    val customSignature by viewModel.customSignature.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "تنظیمات پیام",
                        fontWeight = FontWeight.Bold,
                        fontSize = 18.sp
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(imageVector = Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "برگشت")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Option 1: Delivery Reports
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "گزارش تحویل (Delivery Reports)",
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Text(
                        text = "درخواست گزارش تحویل برای پیام‌های ارسال شده",
                        fontSize = 12.sp,
                        color = Color.Gray
                    )
                }
                Switch(
                    checked = deliveryReports,
                    onCheckedChange = { viewModel.setDeliveryReports(it) }
                )
            }

            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))

            // Option 2: Read Receipts
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "تأییدیه خوانده شدن",
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Text(
                        text = "ارسال تأییدیه هنگام خوانده شدن پیام‌ها توسط شما",
                        fontSize = 12.sp,
                        color = Color.Gray
                    )
                }
                Switch(
                    checked = readReceipts,
                    onCheckedChange = { viewModel.setReadReceipts(it) }
                )
            }

            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))

            // Option 3: Auto delete
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "حذف خودکار پیام‌های قدیمی",
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Text(
                        text = "حذف خودکار پیام‌های قدیمی‌تر از یک سال برای خالی کردن فضا",
                        fontSize = 12.sp,
                        color = Color.Gray
                    )
                }
                Switch(
                    checked = autoDeleteOld,
                    onCheckedChange = { viewModel.setAutoDeleteOld(it) }
                )
            }

            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))

            // Option 4: Custom Signature
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 4.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text(
                    text = "امضای پیامک",
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Text(
                    text = "افزودن خودکار متن به انتهای پیام‌های ارسالی",
                    fontSize = 12.sp,
                    color = Color.Gray
                )
                OutlinedTextField(
                    value = customSignature,
                    onValueChange = { viewModel.setCustomSignature(it) },
                    placeholder = { Text("مثال: فرستاده شده از گوشی من") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )
            }
        }
    }
}

/**
 * Super precise Gregorian to Jalali (Solar Hijri) date conversion helper.
 */
object JalaliCalendarHelper {
    fun convertToPersianDigits(input: String): String {
        return input.replace('0', '۰')
            .replace('1', '۱')
            .replace('2', '۲')
            .replace('3', '۳')
            .replace('4', '۴')
            .replace('5', '۵')
            .replace('6', '۶')
            .replace('7', '۷')
            .replace('8', '۸')
            .replace('9', '۹')
    }

    fun getJalaliDateString(timestamp: Long): String {
        val cal = java.util.GregorianCalendar(java.util.TimeZone.getDefault(), java.util.Locale.US).apply { timeInMillis = timestamp }
        val gy = cal.get(java.util.Calendar.YEAR)
        val gm = cal.get(java.util.Calendar.MONTH) + 1
        val gd = cal.get(java.util.Calendar.DAY_OF_MONTH)

        val gDaysInMonth = intArrayOf(0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31)
        val jDaysInMonth = intArrayOf(31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29)

        var jy = 979
        val gyShifted = gy - 1600

        val isLeapGregorian = (gy % 4 == 0 && gy % 100 != 0) || (gy % 400 == 0)
        val febDays = if (isLeapGregorian) 29 else 28

        var gDayNo = 365 * gyShifted + (gyShifted + 3) / 4 - (gyShifted + 99) / 100 + (gyShifted + 399) / 400
        for (i in 1 until gm) {
            if (i == 2) {
                gDayNo += febDays
            } else {
                gDayNo += gDaysInMonth[i]
            }
        }
        gDayNo += gd - 1

        var jDayNo = gDayNo - 79
        val jNp = jDayNo / 12053
        jDayNo %= 12053
        jy += 33 * jNp

        jy += 4 * (jDayNo / 1461)
        jDayNo %= 1461

        if (jDayNo >= 366) {
            jy += (jDayNo - 1) / 365
            jDayNo = (jDayNo - 1) % 365
        }

        var jm = 1
        var i = 0
        while (i < 11 && jDayNo >= jDaysInMonth[i]) {
            jDayNo -= jDaysInMonth[i]
            i++
            jm++
        }
        val jd = jDayNo + 1

        val monthNames = arrayOf(
            "", "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
            "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"
        )

        return "$jd ${monthNames[jm]} $jy"
    }

    fun formatTimestamp(timestamp: Long): String {
        val now = java.util.GregorianCalendar(java.util.TimeZone.getDefault(), java.util.Locale.US)
        val msgTime = java.util.GregorianCalendar(java.util.TimeZone.getDefault(), java.util.Locale.US).apply { timeInMillis = timestamp }

        val sameYear = now.get(java.util.Calendar.YEAR) == msgTime.get(java.util.Calendar.YEAR)
        val sameDayOfYear = now.get(java.util.Calendar.DAY_OF_YEAR) == msgTime.get(java.util.Calendar.DAY_OF_YEAR)

        return if (sameYear && sameDayOfYear) {
            val df = SimpleDateFormat("HH:mm", Locale.getDefault())
            convertToPersianDigits(df.format(Date(timestamp)))
        } else if (sameYear && (now.get(java.util.Calendar.DAY_OF_YEAR) - msgTime.get(java.util.Calendar.DAY_OF_YEAR) == 1)) {
            "دیروز"
        } else {
            convertToPersianDigits(getJalaliDateString(timestamp))
        }
    }

    fun formatDetailedTime(timestamp: Long): String {
        val dateString = getJalaliDateString(timestamp)
        val df = SimpleDateFormat("HH:mm", Locale.getDefault())
        val timeString = df.format(Date(timestamp))
        return convertToPersianDigits("$dateString، ساعت $timeString")
    }
}
