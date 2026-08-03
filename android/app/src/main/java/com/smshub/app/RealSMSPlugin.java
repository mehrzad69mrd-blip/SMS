package com.smshub.app;

import android.Manifest;
import android.content.ContentResolver;
import android.content.Context;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.telephony.SmsManager;
import androidx.core.content.ContextCompat;
import androidx.core.app.ActivityCompat;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.ArrayList;

@CapacitorPlugin(name = "RealSMS")
public class RealSMSPlugin extends Plugin {

    @PluginMethod
    public void hasPermission(PluginCall call) {
        Context context = getContext();
        boolean readSMS = ContextCompat.checkSelfPermission(context, Manifest.permission.READ_SMS) == PackageManager.PERMISSION_GRANTED;
        boolean sendSMS = ContextCompat.checkSelfPermission(context, Manifest.permission.SEND_SMS) == PackageManager.PERMISSION_GRANTED;
        
        JSObject ret = new JSObject();
        ret.put("readSMS", readSMS);
        ret.put("sendSMS", sendSMS);
        ret.put("granted", readSMS && sendSMS);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        String[] permissions = new String[]{
            Manifest.permission.READ_SMS,
            Manifest.permission.SEND_SMS,
            Manifest.permission.RECEIVE_SMS
        };
        ActivityCompat.requestPermissions(getActivity(), permissions, 1001);
        
        JSObject ret = new JSObject();
        ret.put("requested", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void getInboxSMS(PluginCall call) {
        Context context = getContext();
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.READ_SMS) != PackageManager.PERMISSION_GRANTED) {
            call.reject("Permission denied: READ_SMS");
            return;
        }

        JSArray messages = new JSArray();
        Uri uri = Uri.parse("content://sms/inbox");
        ContentResolver cr = context.getContentResolver();
        
        Cursor cursor = null;
        try {
            cursor = cr.query(uri, new String[]{"_id", "address", "body", "date", "read"}, null, null, "date DESC LIMIT 50");
            if (cursor != null && cursor.moveToFirst()) {
                do {
                    JSObject sms = new JSObject();
                    sms.put("id", "real-" + cursor.getString(cursor.getColumnIndexOrThrow("_id")));
                    sms.put("sender", cursor.getString(cursor.getColumnIndexOrThrow("address")));
                    sms.put("text", cursor.getString(cursor.getColumnIndexOrThrow("body")));
                    sms.put("timestamp", cursor.getLong(cursor.getColumnIndexOrThrow("date")));
                    sms.put("isRead", cursor.getInt(cursor.getColumnIndexOrThrow("read")) == 1);
                    messages.put(sms);
                } while (cursor.moveToNext());
            }
        } catch (Exception e) {
            call.reject("Error reading SMS inbox: " + e.getMessage());
            return;
        } finally {
            if (cursor != null) {
                cursor.close();
            }
        }

        JSObject ret = new JSObject();
        ret.put("messages", messages);
        call.resolve(ret);
    }

    @PluginMethod
    public void sendRealSMS(PluginCall call) {
        String phoneNumber = call.getString("phoneNumber");
        String messageText = call.getString("messageText");

        if (phoneNumber == null || phoneNumber.isEmpty()) {
            call.reject("phoneNumber is required");
            return;
        }
        if (messageText == null || messageText.isEmpty()) {
            call.reject("messageText is required");
            return;
        }

        Context context = getContext();
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.SEND_SMS) != PackageManager.PERMISSION_GRANTED) {
            call.reject("Permission denied: SEND_SMS");
            return;
        }

        try {
            SmsManager smsManager;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                smsManager = context.getSystemService(SmsManager.class);
            } else {
                smsManager = SmsManager.getDefault();
            }
            
            if (messageText.length() > 70) {
                ArrayList<String> parts = smsManager.divideMessage(messageText);
                smsManager.sendMultipartTextMessage(phoneNumber, null, parts, null, null);
            } else {
                smsManager.sendTextMessage(phoneNumber, null, messageText, null, null);
            }
            
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to send SMS: " + e.getMessage());
        }
    }
}
