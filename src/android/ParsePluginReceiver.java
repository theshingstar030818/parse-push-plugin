package org.apache.cordova.core;

import com.parse.ParsePushBroadcastReceiver;
import com.parse.ParseAnalytics;

import android.app.Activity;
import android.app.TaskStackBuilder;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.net.Uri;
import android.util.Log;

import org.json.JSONObject;
import org.json.JSONException;

public class ParsePluginReceiver extends ParsePushBroadcastReceiver
{	
	@Override
    protected void onPushOpen(Context context, Intent intent) {
		//
		// Note: preempt a Parse Android SDK bug observed in 1.7.0 and 1.7.1
		// where empty/null uri string causes crash
		//
        ParseAnalytics.trackAppOpenedInBackground(intent);

        String uriString = null;
        try {
            JSONObject pushData = new JSONObject(intent.getStringExtra("com.parse.Data"));
            uriString = pushData.optString("uri");
        } catch (JSONException e) {
            Log.w("com.parse.ParsePushBroadcastReceiver", "Unexpected JSONException when receiving push data in subclass of ParsePushBroadcastReceiver: ", e);
        }
        
        Class<? extends Activity> cls = getActivity(context, intent);
        
        Intent activityIntent;
        if (uriString != null && !uriString.isEmpty()) {
            activityIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(uriString));
        } else {
            activityIntent = new Intent(context, cls);
        }
        activityIntent.putExtras(intent.getExtras());
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.HONEYCOMB) {
            TaskStackBuilder stackBuilder = TaskStackBuilder.create(context);
            stackBuilder.addParentStack(cls);
            stackBuilder.addNextIntent(activityIntent);
            stackBuilder.startActivities();
        } else {
            activityIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            activityIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
            context.startActivity(activityIntent);
        }
    }
}
