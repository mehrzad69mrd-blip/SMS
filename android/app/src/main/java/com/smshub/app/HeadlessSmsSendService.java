package com.smshub.app;

import android.app.Service;
import android.content.Intent;
import android.os.IBinder;
import android.util.Log;

public class HeadlessSmsSendService extends Service {
    private static final String TAG = "HeadlessSmsSendService";

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.d(TAG, "HeadlessSmsSendService started");
        // Process any quick-respond actions here
        stopSelf(startId);
        return START_NOT_STICKY;
    }
}
