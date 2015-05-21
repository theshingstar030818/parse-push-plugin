package com.phonegap.plugins;

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


///////
import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.os.Bundle;
import android.support.v4.app.NotificationCompat;


public class ParsePushPluginReceiver extends ParsePushBroadcastReceiver
{	
	public static final String LOGTAG = "ParsePushPluginReceiver";
	public static final String PARSE_DATA_KEY = "com.parse.Data";
	
	
	//@Override
	//protected getNotification(Context context, Intent intent){
	//	NotificationCompat.Builder builder = new NotificationCompat.Builder(context);
	//    builder.setContentTitle("Title")
	//           .setContentText("Text")
	//           .setSmallIcon(context.getApplicationInfo().icon) //.setSmallIcon(R.drawable.ic_notification)
	//           .setAutoCancel(true);
    //
	//    notificationManager.notify("MyTag", 0, builder.build());
	//}
	
	@Override
	protected void onPushReceive(Context context, Intent intent) {
		Log.d(LOGTAG, "onPushReceive - context: " + context);
		
		Intent pnIntent = new Intent(context, getActivity(context, intent));
		pnIntent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
		pnIntent.putExtras(intent);
		
		
		
		NotificationManager notifManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
		JSONObject pnData = getPushData(intent);
		
		//
		// use tag + notification id to limit the number of notifications on the tray
		// (older messages with the same tag and notification id will be replaced)
		//
		String pnTag = pnData.optString("title", getAppName(context));
		int pnId = 0;
	    notifManager.notify(pnTag, pnId, getNotification(context, pnIntent));
		
	    //
	    // relay the push notification data to the javascript
		ParsePushPlugin.javascriptECB( pnData );
	}
	
	@Override
    protected void onPushOpen(Context context, Intent intent) {
		//
		// Note: preempt a Parse Android SDK bug observed in 1.7.0 and 1.7.1
		// where empty/null uri string causes crash
		//
        ParseAnalytics.trackAppOpenedInBackground(intent);

        JSONObject pnData = getPushData(intent);
        String uriString = pnData.optString("uri");
        Class<? extends Activity> cls = getActivity(context, intent);
        
        Intent activityIntent;
        if (!uriString.isEmpty()) {
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
	
	private static JSONObject getPushData(Intent intent){
		JSONObject pnData = null;
		try {
            pnData = new JSONObject(intent.getStringExtra(PARSE_DATA_KEY));
        } catch (JSONException e) {
            Log.e(LOGTAG, "JSONException while parsing push data:", e);
        } finally{
        	return pnData;
        }
	}
	
	private static String getAppName(Context context){
		CharSequence appName = context.getPackageManager()
					                  .getApplicationLabel(context.getApplicationInfo());
		return (String)appName;
	}
}