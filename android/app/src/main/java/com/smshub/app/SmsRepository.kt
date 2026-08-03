package com.smshub.app

import android.Manifest
import android.content.ContentResolver
import android.content.Context
import android.content.pm.PackageManager
import android.database.Cursor
import android.net.Uri
import android.provider.Telephony
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
    val date: Long,
    val isRead: Boolean
)

/**
 * Clean Domain Data Class representing an SMS Conversation Thread.
 */
data class SmsThread(
    val threadId: Long,
    val snippet: String,
    val msgCount: Int,
    val date: Long,
    val address: String,
    val isRead: Boolean
)

/**
 * Repository responsible for reading SMS threads and messages from the device's native ContentProvider.
 * Implements best practices for Coroutines, Flow, and explicit permission validation.
 */
class SmsRepository(private val context: Context) {

    private val contentResolver: ContentResolver = context.contentResolver

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
     * Fetches all SMS messages inside the inbox, grouped by conversation thread_id.
     * Emits a list of unique SmsThread objects via a Kotlin Flow running on the I/O Dispatcher.
     */
    fun getSmsThreads(): Flow<List<SmsThread>> = flow {
        if (!hasReadSmsPermission()) {
            emit(emptyList())
            return@flow
        }

        val threadsList = mutableListOf<SmsThread>()
        
        // We can query the content://sms/conversations projection or group inbox by thread_id
        val uri: Uri = Uri.parse("content://sms/inbox")
        val projection = arrayOf(
            Telephony.Sms.THREAD_ID,
            Telephony.Sms.BODY,
            Telephony.Sms.ADDRESS,
            Telephony.Sms.DATE,
            Telephony.Sms.READ,
            "count(${Telephony.Sms._ID}) AS msg_count"
        )
        
        // Grouping parameter passed inside selection query parameters
        val selection = "0==0) GROUP BY (${Telephony.Sms.THREAD_ID}"
        val sortOrder = "${Telephony.Sms.DATE} DESC"

        var cursor: Cursor? = null
        try {
            cursor = contentResolver.query(
                uri,
                projection,
                selection,
                null,
                sortOrder
            )

            cursor?.let {
                val threadIdCol = it.getColumnIndexOrThrow(Telephony.Sms.THREAD_ID)
                val bodyCol = it.getColumnIndexOrThrow(Telephony.Sms.BODY)
                val addressCol = it.getColumnIndexOrThrow(Telephony.Sms.ADDRESS)
                val dateCol = it.getColumnIndexOrThrow(Telephony.Sms.DATE)
                val readCol = it.getColumnIndexOrThrow(Telephony.Sms.READ)
                val countCol = it.getColumnIndex("msg_count") // Custom projection column

                while (it.moveToNext()) {
                    val threadId = it.getLong(threadIdCol)
                    val snippet = it.getString(bodyCol) ?: ""
                    val address = it.getString(addressCol) ?: "Unknown"
                    val date = it.getLong(dateCol)
                    val isRead = it.getInt(readCol) == 1
                    val msgCount = if (countCol != -1) it.getInt(countCol) else 1

                    threadsList.add(
                        SmsThread(
                            threadId = threadId,
                            snippet = snippet,
                            msgCount = msgCount,
                            date = date,
                            address = address,
                            isRead = isRead
                        )
                    )
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        } finally {
            cursor?.close()
        }

        emit(threadsList)
    }.flowOn(Dispatchers.IO)

    /**
     * Fetches all individual messages belonging to a specific threadId.
     * Emits a clean List of SmsMessage domain items ordered by date descending.
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
            Telephony.Sms.READ
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

                while (it.moveToNext()) {
                    messagesList.add(
                        SmsMessage(
                            id = it.getLong(idCol),
                            threadId = it.getLong(threadIdCol),
                            address = it.getString(addressCol) ?: "Unknown",
                            body = it.getString(bodyCol) ?: "",
                            date = it.getLong(dateCol),
                            isRead = it.getInt(readCol) == 1
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
}
