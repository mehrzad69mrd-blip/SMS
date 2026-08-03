package com.smshub.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.provider.Telephony;
import android.telephony.SmsMessage;
import android.util.Log;

public class SmsReceiver extends BroadcastReceiver {
    private static final String TAG = "SmsReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || !Telephony.Sms.Intents.SMS_DELIVER_ACTION.equals(intent.getAction())) {
            return;
        }

        Log.d(TAG, "SMS received via default handler!");
        SmsMessage[] messages = Telephony.Sms.Intents.getMessagesFromIntent(intent);
        if (messages != null) {
            for (SmsMessage message : messages) {
                if (message != null) {
                    String sender = message.getDisplayOriginatingAddress();
                    String body = message.getDisplayMessageBody();
                    long timestamp = message.getTimestampMillis();
                    
                    Log.d(TAG, "New SMS - From: " + sender + ", Body: " + body + ", Timestamp: " + timestamp);
                    
                    // Trigger custom system logic or local broadcast
                }
            }
        }
    }
}
