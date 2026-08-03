package com.smshub.app;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;

public class ComposeSmsActivity extends Activity {
    private static final String TAG = "ComposeSmsActivity";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Log.d(TAG, "ComposeSmsActivity started");

        Intent intent = getIntent();
        if (intent != null) {
            Uri data = intent.getData();
            String action = intent.getAction();
            Log.d(TAG, "Action: " + action + ", Data URI: " + (data != null ? data.toString() : "null"));
            
            // Redirect or process the intent, then exit or launch main UI
            Intent mainIntent = new Intent(this, MainActivity.class);
            mainIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            startActivity(mainIntent);
        }
        
        finish();
    }
}
