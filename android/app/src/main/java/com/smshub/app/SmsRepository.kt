package com.smshub.app

import android.Manifest
import android.content.ContentResolver
import android.content.Context
import android.content.pm.PackageManager
import android.database.Cursor
import android.net.Uri
import android.provider.Telephony
import android.telephony.SmsManager
import androidx.core.content.ContextCompat
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOn

/**
 * Clean Domain Data Class representing an SMS Message.
 */
data class SmsMessage(
    val id: Long,
    val threadId: Long,
    val address: String,
    val body: String,
    val timestamp: Long,
    val isRead: Boolean,
    val type: Int, // Telephony.Sms.MESSAGE_TYPE_INBOX or MESSAGE_TYPE_SENT
    val contactName: String = ""
)

/**
 * Repository responsible for reading SMS threads and messages from the device's native ContentProvider
 * and sending SMS messages.
 */
class SmsRepository(private val context: Context) {

    private val contentResolver: ContentResolver = context.contentResolver
    private val contactCache = mutableMapOf<String, String>()

    /**
     * Resolves a phone number/address to a contact name using the Contacts Provider, with an in-memory cache for performance.
     */
    fun getContactName(address: String): String {
        if (address.isBlank() || address == "Unknown") return address
        
        contactCache[address]?.let { return it }

        if (ContextCompat.checkSelfPermission(context, Manifest.permission.READ_CONTACTS) != PackageManager.PERMISSION_GRANTED) {
            return address
        }

        var contactName = address
        var cursor: Cursor? = null
        try {
            val uri = Uri.withAppendedPath(
                android.provider.ContactsContract.PhoneLookup.CONTENT_FILTER_URI,
                Uri.encode(address)
            )
            val projection = arrayOf(android.provider.ContactsContract.PhoneLookup.DISPLAY_NAME)
            cursor = contentResolver.query(uri, projection, null, null, null)
            if (cursor != null && cursor.moveToFirst()) {
                val nameCol = cursor.getColumnIndex(android.provider.ContactsContract.PhoneLookup.DISPLAY_NAME)
                if (nameCol != -1) {
                    val name = cursor.getString(nameCol)
                    if (!name.isNullOrBlank()) {
                        contactName = name
                        contactCache[address] = name
                    }
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        } finally {
            cursor?.close()
        }
        return contactName
    }

    fun getDeliveryReportsEnabled(): Boolean {
        val prefs = context.getSharedPreferences("sms_settings", Context.MODE_PRIVATE)
        return prefs.getBoolean("delivery_reports", false)
    }

    fun setDeliveryReportsEnabled(enabled: Boolean) {
        val prefs = context.getSharedPreferences("sms_settings", Context.MODE_PRIVATE)
        prefs.edit().putBoolean("delivery_reports", enabled).apply()
    }

    fun getReadReceiptsEnabled(): Boolean {
        val prefs = context.getSharedPreferences("sms_settings", Context.MODE_PRIVATE)
        return prefs.getBoolean("read_receipts", true)
    }

    fun setReadReceiptsEnabled(enabled: Boolean) {
        val prefs = context.getSharedPreferences("sms_settings", Context.MODE_PRIVATE)
        prefs.edit().putBoolean("read_receipts", enabled).apply()
    }

    fun getAutoDeleteOldEnabled(): Boolean {
        val prefs = context.getSharedPreferences("sms_settings", Context.MODE_PRIVATE)
        return prefs.getBoolean("auto_delete_old", false)
    }

    fun setAutoDeleteOldEnabled(enabled: Boolean) {
        val prefs = context.getSharedPreferences("sms_settings", Context.MODE_PRIVATE)
        prefs.edit().putBoolean("auto_delete_old", enabled).apply()
    }

    fun getCustomSignature(): String {
        val prefs = context.getSharedPreferences("sms_settings", Context.MODE_PRIVATE)
        return prefs.getString("custom_signature", "") ?: ""
    }

    fun setCustomSignature(signature: String) {
        val prefs = context.getSharedPreferences("sms_settings", Context.MODE_PRIVATE)
        prefs.edit().putString("custom_signature", signature).apply()
    }

    fun getAppTheme(): String {
        val prefs = context.getSharedPreferences("sms_settings", Context.MODE_PRIVATE)
        return prefs.getString("app_theme", "system") ?: "system"
    }

    fun setAppTheme(theme: String) {
        val prefs = context.getSharedPreferences("sms_settings", Context.MODE_PRIVATE)
        prefs.edit().putString("app_theme", theme).apply()
    }

    /**
     * Checks if the required READ_SMS permission is granted.
     */
    fun hasReadSmsPermission(): Boolean {
        return ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.READ_SMS
        ) == PackageManager.PERMISSION_GRANTED
    }

    /**
     * Checks if the required SEND_SMS permission is granted.
     */
    fun hasSendSmsPermission(): Boolean {
        return ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.SEND_SMS
        ) == PackageManager.PERMISSION_GRANTED
    }

    /**
     * Checks if this app is currently the system's Default SMS Application.
     */
    fun isDefaultSmsApp(): Boolean {
        val defaultSmsPackage = Telephony.Sms.getDefaultSmsPackage(context)
        return defaultSmsPackage == context.packageName
    }

    /**
     * Retrieves or creates the standard system thread ID for a given phone number/address.
     */
    fun getThreadIdForAddress(address: String): Long? {
        return try {
            Telephony.Threads.getOrCreateThreadId(context, address)
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    /**
     * Fetches all conversations/threads grouped by threadId.
     * Maps the latest message in each conversation to an SmsMessage.
     * Emits the unique conversations ordered by timestamp descending.
     */
    fun getConversations(): Flow<List<SmsMessage>> = flow {
        if (!hasReadSmsPermission()) {
            emit(emptyList())
            return@flow
        }

        val conversationsMap = mutableMapOf<Long, SmsMessage>()
        val uri: Uri = Uri.parse("content://sms")
        val projection = arrayOf(
            Telephony.Sms._ID,
            Telephony.Sms.THREAD_ID,
            Telephony.Sms.ADDRESS,
            Telephony.Sms.BODY,
            Telephony.Sms.DATE,
            Telephony.Sms.READ,
            Telephony.Sms.TYPE
        )

        // Query all messages, sorted by date descending so the first one we find for a threadId is the newest
        val sortOrder = "${Telephony.Sms.DATE} DESC"

        var cursor: Cursor? = null
        try {
            cursor = contentResolver.query(
                uri,
                projection,
                null,
                null,
                sortOrder
            )

            cursor?.let {
                val idCol = it.getColumnIndexOrThrow(Telephony.Sms._ID)
                val threadIdCol = it.getColumnIndexOrThrow(Telephony.Sms.THREAD_ID)
                val addressCol = it.getColumnIndexOrThrow(Telephony.Sms.ADDRESS)
                val bodyCol = it.getColumnIndexOrThrow(Telephony.Sms.BODY)
                val dateCol = it.getColumnIndexOrThrow(Telephony.Sms.DATE)
                val readCol = it.getColumnIndexOrThrow(Telephony.Sms.READ)
                val typeCol = it.getColumnIndexOrThrow(Telephony.Sms.TYPE)

                while (it.moveToNext()) {
                    val threadId = it.getLong(threadIdCol)
                    
                    // Since it is sorted by date DESC, we only insert if we haven't seen this threadId yet
                    if (!conversationsMap.containsKey(threadId)) {
                        val id = it.getLong(idCol)
                        val address = it.getString(addressCol) ?: "Unknown"
                        val body = it.getString(bodyCol) ?: ""
                        val timestamp = it.getLong(dateCol)
                        val isRead = it.getInt(readCol) == 1
                        val type = it.getInt(typeCol)
                        val contactName = getContactName(address)

                        conversationsMap[threadId] = SmsMessage(
                            id = id,
                            threadId = threadId,
                            address = address,
                            body = body,
                            timestamp = timestamp,
                            isRead = isRead,
                            type = type,
                            contactName = contactName
                        )
                    }
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        } finally {
            cursor?.close()
        }

        // Return sorted by latest timestamp descending
        emit(conversationsMap.values.sortedByDescending { it.timestamp })
    }.flowOn(Dispatchers.IO)

    /**
     * Fetches all individual messages belonging to a specific threadId.
     * Emits a clean List of SmsMessage domain items ordered by timestamp ascending.
     */
    fun getMessagesForThread(threadId: Long): Flow<List<SmsMessage>> = flow {
        if (!hasReadSmsPermission()) {
            emit(emptyList())
            return@flow
        }

        val messagesList = mutableListOf<SmsMessage>()
        val uri: Uri = Uri.parse("content://sms")
        val projection = arrayOf(
            Telephony.Sms._ID,
            Telephony.Sms.THREAD_ID,
            Telephony.Sms.ADDRESS,
            Telephony.Sms.BODY,
            Telephony.Sms.DATE,
            Telephony.Sms.READ,
            Telephony.Sms.TYPE
        )
        
        val selection = "${Telephony.Sms.THREAD_ID} = ?"
        val selectionArgs = arrayOf(threadId.toString())
        val sortOrder = "${Telephony.Sms.DATE} ASC"

        var cursor: Cursor? = null
        try {
            cursor = contentResolver.query(
                uri,
                projection,
                selection,
                selectionArgs,
                sortOrder
            )

            cursor?.let {
                val idCol = it.getColumnIndexOrThrow(Telephony.Sms._ID)
                val threadIdCol = it.getColumnIndexOrThrow(Telephony.Sms.THREAD_ID)
                val addressCol = it.getColumnIndexOrThrow(Telephony.Sms.ADDRESS)
                val bodyCol = it.getColumnIndexOrThrow(Telephony.Sms.BODY)
                val dateCol = it.getColumnIndexOrThrow(Telephony.Sms.DATE)
                val readCol = it.getColumnIndexOrThrow(Telephony.Sms.READ)
                val typeCol = it.getColumnIndexOrThrow(Telephony.Sms.TYPE)

                while (it.moveToNext()) {
                    val address = it.getString(addressCol) ?: "Unknown"
                    val contactName = getContactName(address)
                    messagesList.add(
                        SmsMessage(
                            id = it.getLong(idCol),
                            threadId = it.getLong(threadIdCol),
                            address = address,
                            body = it.getString(bodyCol) ?: "",
                            timestamp = it.getLong(dateCol),
                            isRead = it.getInt(readCol) == 1,
                            type = it.getInt(typeCol),
                            contactName = contactName
                        )
                    )
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        } finally {
            cursor?.close()
        }

        emit(messagesList)
    }.flowOn(Dispatchers.IO)

    /**
     * Sends an SMS message using SmsManager.
     * Returns true if sent successfully without exceptions.
     */
    fun sendSms(address: String, message: String): Boolean {
        return try {
            // Strictly check for SEND_SMS permission before calling sendTextMessage
            if (ContextCompat.checkSelfPermission(context, Manifest.permission.SEND_SMS) != PackageManager.PERMISSION_GRANTED) {
                throw SecurityException("Permission android.permission.SEND_SMS is not granted")
            }

            val smsManager: SmsManager = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
                context.getSystemService(SmsManager::class.java)
            } else {
                @Suppress("DEPRECATION")
                SmsManager.getDefault()
            } ?: throw Exception("SmsManager is not available")
            
            // Divide the message into parts in case it exceeds 160 characters
            val parts = smsManager.divideMessage(message)
            if (parts.size > 1) {
                smsManager.sendMultipartTextMessage(address, null, parts, null, null)
            } else {
                smsManager.sendTextMessage(address, null, message, null, null)
            }
            true
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    /**
     * Marks all messages in a specific thread as read.
     */
    fun markThreadAsRead(threadId: Long) {
        if (!hasReadSmsPermission()) return
        try {
            val values = android.content.ContentValues().apply {
                put(Telephony.Sms.READ, 1)
            }
            val uri = Uri.parse("content://sms")
            val selection = "${Telephony.Sms.THREAD_ID} = ? AND ${Telephony.Sms.READ} = 0"
            val selectionArgs = arrayOf(threadId.toString())
            contentResolver.update(uri, values, selection, selectionArgs)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    /**
     * Deletes a specific message by its content ID.
     */
    fun deleteMessage(messageId: Long): Boolean {
        if (!hasReadSmsPermission()) return false
        return try {
            val uri = Uri.withAppendedPath(Telephony.Sms.CONTENT_URI, messageId.toString())
            val rowsDeleted = contentResolver.delete(uri, null, null)
            rowsDeleted > 0
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }
}
