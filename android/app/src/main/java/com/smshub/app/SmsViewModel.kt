package com.smshub.app

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

/**
 * Sealed class representing UI States for Conversations/Threads.
 */
sealed interface ConversationsUiState {
    object Idle : ConversationsUiState
    object Loading : ConversationsUiState
    data class Success(val conversations: List<SmsMessage>) : ConversationsUiState
    data class Error(val exception: Throwable) : ConversationsUiState
}

/**
 * Sealed class representing UI States for a Specific Thread/Chat history.
 */
sealed interface MessagesUiState {
    object Idle : MessagesUiState
    object Loading : MessagesUiState
    data class Success(val messages: List<SmsMessage>) : MessagesUiState
    data class Error(val exception: Throwable) : MessagesUiState
}

/**
 * ViewModel managing states and business logic for the SMS Hub dashboard and chat views.
 */
class SmsViewModel(private val repository: SmsRepository) : ViewModel() {

    // Conversations state
    private val _conversationsState = MutableStateFlow<ConversationsUiState>(ConversationsUiState.Idle)
    val conversationsState: StateFlow<ConversationsUiState> = _conversationsState.asStateFlow()

    // Selected category state
    private val _selectedCategory = MutableStateFlow<SmsCategory>(SmsCategory.ALL)
    val selectedCategory: StateFlow<SmsCategory> = _selectedCategory.asStateFlow()

    // Message Settings States
    private val _deliveryReports = MutableStateFlow(repository.getDeliveryReportsEnabled())
    val deliveryReports: StateFlow<Boolean> = _deliveryReports.asStateFlow()

    private val _readReceipts = MutableStateFlow(repository.getReadReceiptsEnabled())
    val readReceipts: StateFlow<Boolean> = _readReceipts.asStateFlow()

    private val _autoDeleteOld = MutableStateFlow(repository.getAutoDeleteOldEnabled())
    val autoDeleteOld: StateFlow<Boolean> = _autoDeleteOld.asStateFlow()

    private val _customSignature = MutableStateFlow(repository.getCustomSignature())
    val customSignature: StateFlow<String> = _customSignature.asStateFlow()

    fun setDeliveryReports(enabled: Boolean) {
        repository.setDeliveryReportsEnabled(enabled)
        _deliveryReports.value = enabled
    }

    fun setReadReceipts(enabled: Boolean) {
        repository.setReadReceiptsEnabled(enabled)
        _readReceipts.value = enabled
    }

    fun setAutoDeleteOld(enabled: Boolean) {
        repository.setAutoDeleteOldEnabled(enabled)
        _autoDeleteOld.value = enabled
    }

    fun setCustomSignature(signature: String) {
        repository.setCustomSignature(signature)
        _customSignature.value = signature
    }

    /**
     * Updates the currently selected category.
     */
    fun selectCategory(category: SmsCategory) {
        _selectedCategory.value = category
    }

    /**
     * StateFlow representing conversations filtered by the selected category.
     */
    val filteredConversations: StateFlow<ConversationsUiState> = combine(
        _conversationsState,
        _selectedCategory
    ) { state, category ->
        when (state) {
            is ConversationsUiState.Success -> {
                val filteredList = if (category == SmsCategory.ALL) {
                    state.conversations
                } else {
                    state.conversations.filter { message ->
                        SmsCategorizer.categorize(message.address, message.body) == category
                    }
                }
                ConversationsUiState.Success(filteredList)
            }
            else -> state
        }
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = ConversationsUiState.Idle
    )

    // Currently selected conversation messages state
    private val _messagesState = MutableStateFlow<MessagesUiState>(MessagesUiState.Idle)
    val messagesState: StateFlow<MessagesUiState> = _messagesState.asStateFlow()

    // ID of currently active selected thread
    private val _selectedThreadId = MutableStateFlow<Long?>(null)
    val selectedThreadId: StateFlow<Long?> = _selectedThreadId.asStateFlow()

    // Event flow for notifications (e.g. show Toast or Snackbar when SMS fails/succeeds)
    private val _uiEvent = MutableSharedFlow<SmsUiEvent>()
    val uiEvent: SharedFlow<SmsUiEvent> = _uiEvent.asSharedFlow()

    /**
     * Starts monitoring/loading the conversations list from the device content provider.
     */
    fun loadConversations() {
        _conversationsState.value = ConversationsUiState.Loading
        viewModelScope.launch {
            repository.getConversations()
                .catch { exception ->
                    _conversationsState.value = ConversationsUiState.Error(exception)
                }
                .collect { list ->
                    _conversationsState.value = ConversationsUiState.Success(list)
                }
        }
    }

    /**
     * Selects a specific conversation thread and loads all its messages.
     */
    fun selectThread(threadId: Long) {
        _selectedThreadId.value = threadId
        _messagesState.value = MessagesUiState.Loading
        viewModelScope.launch {
            repository.getMessagesForThread(threadId)
                .catch { exception ->
                    _messagesState.value = MessagesUiState.Error(exception)
                }
                .collect { list ->
                    _messagesState.value = MessagesUiState.Success(list)
                }
        }
    }

    /**
     * Deselects the active thread.
     */
    fun clearSelectedThread() {
        _selectedThreadId.value = null
        _messagesState.value = MessagesUiState.Idle
    }

    /**
     * Sends an SMS message to the given address. If successful, broadcasts a success event
     * and re-triggers the messages reload for the currently selected thread.
     */
    fun sendMessage(address: String, body: String) {
        if (address.isBlank() || body.isBlank()) {
            viewModelScope.launch {
                _uiEvent.emit(SmsUiEvent.ShowError("Recipient address or message body cannot be empty"))
            }
            return
        }

        viewModelScope.launch {
            val success = repository.sendSms(address, body)
            if (success) {
                _uiEvent.emit(SmsUiEvent.SmsSentSuccess)
                // Reload conversations and current active thread to reflect the sent message
                loadConversations()
                _selectedThreadId.value?.let { activeId ->
                    selectThread(activeId)
                }
            } else {
                _uiEvent.emit(SmsUiEvent.ShowError("Failed to send message. Please verify permissions or balance."))
            }
        }
    }
}

/**
 * Sealed class representing transient UI events/actions for user feedback.
 */
sealed interface SmsUiEvent {
    object SmsSentSuccess : SmsUiEvent
    data class ShowError(val message: String) : SmsUiEvent
}
