package com.phonegap.parsepushplugin;

import java.util.List;
import java.lang.Exception;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CordovaWebView;
import org.json.JSONArray;
import org.json.JSONObject;
import org.json.JSONException;

import com.parse.Parse;
import com.parse.ParsePush;
import com.parse.ParseInstallation;

import android.util.Log;

public class ParsePushPlugin extends CordovaPlugin {
    public static final String ACTION_REGISTER = "register";
    public static final String ACTION_GET_INSTALLATION_ID = "getInstallationId";
    public static final String ACTION_GET_INSTALLATION_OBJECT_ID = "getInstallationObjectId";
    public static final String ACTION_GET_SUBSCRIPTIONS = "getSubscriptions";
    public static final String ACTION_SUBSCRIBE = "subscribe";
    public static final String ACTION_UNSUBSCRIBE = "unsubscribe";
    
    private static String gECB;
    private static CordovaWebView gWebView;
    private static boolean gForeground = false;
    
    public static final String LOGTAG = "ParsePushPlugin";

    @Override
    public boolean execute(String action, JSONArray args, CallbackContext callbackContext) throws JSONException {
    	if (action.equals(ACTION_REGISTER)) {
            this.registerDevice(callbackContext, args);
            return true;
        }
        if (action.equals(ACTION_GET_INSTALLATION_ID)) {
            this.getInstallationId(callbackContext);
            return true;
        }

        if (action.equals(ACTION_GET_INSTALLATION_OBJECT_ID)) {
            this.getInstallationObjectId(callbackContext);
            return true;
        }
        if (action.equals(ACTION_GET_SUBSCRIPTIONS)) {
            this.getSubscriptions(callbackContext);
            return true;
        }
        if (action.equals(ACTION_SUBSCRIBE)) {
            this.subscribe(args.getString(0), callbackContext);
            return true;
        }
        if (action.equals(ACTION_UNSUBSCRIBE)) {
            this.unsubscribe(args.getString(0), callbackContext);
            return true;
        }
        return false;
    }

    private void registerDevice(final CallbackContext callbackContext, final JSONArray args) {
    	try {
        	JSONObject jo = args.getJSONObject(0);
        	
            if(!jo.optString("appId").isEmpty() && !jo.optString("clientKey").isEmpty()){
            	// To quickly test if application is properly setup for push notification, user can
            	// initialize Parse via the register() function in this plugin's js api by
            	// specifying appId and clientKey.
            	// Note: this is for quickstart testing only because this solution only works
            	// while the app is running. It will crash when a pn arrives and the app is not running.
            	// See docs for the real solution involving a MainApplication Java class
                Parse.initialize(cordova.getActivity(), jo.optString("appId"), jo.optString("clientKey"));
                ParseInstallation.getCurrentInstallation().saveInBackground();
            }
            
            //
            // register javascript event callbacks for notification events
            gECB = jo.optString("ecb");
            
            callbackContext.success();
        } catch (JSONException e) {
            callbackContext.error("JSONException: " + e.toString());
        } catch(Exception e){
        	callbackContext.error(e.toString());
        }
    }

    private void getInstallationId(final CallbackContext callbackContext) {
        cordova.getThreadPool().execute(new Runnable() {
            public void run() {
                String installationId = ParseInstallation.getCurrentInstallation().getInstallationId();
                callbackContext.success(installationId);
            }
        });
    }

    private void getInstallationObjectId(final CallbackContext callbackContext) {
        cordova.getThreadPool().execute(new Runnable() {
            public void run() {
                String objectId = ParseInstallation.getCurrentInstallation().getObjectId();
                callbackContext.success(objectId);
            }
        });
    }

    private void getSubscriptions(final CallbackContext callbackContext) {
        cordova.getThreadPool().execute(new Runnable() {
            public void run() {
            	List<String> subscriptions = ParseInstallation.getCurrentInstallation().getList("channels");
                callbackContext.success(subscriptions.toString());
            }
        });
    }

    private void subscribe(final String channel, final CallbackContext callbackContext) {
    	ParsePush.subscribeInBackground(channel);
        callbackContext.success();
    }

    private void unsubscribe(final String channel, final CallbackContext callbackContext) {
    	ParsePush.unsubscribeInBackground(channel);
        callbackContext.success();
    }
    
    /*
    * Use the cordova bridge to call the jsCB and pass it _json as param
    */
    public static void javascriptECB(JSONObject _json){
    	javascriptECB(_json, "RECEIVE");
    }
    public static void javascriptECB(JSONObject _json, String pushAction){
    	boolean isOkAction = pushAction == "RECEIVE" || pushAction == "OPEN";
    	
    	if( isJavascriptReady() && isOkAction ){
    		String snippet = "javascript:" + gECB + "(" + _json.toString() + ",'" + pushAction + "'" + ")";
    		
    		//Log.d(LOGTAG, "javascriptECB snippet " + snippet);
    		gWebView.sendJavascript(snippet);
    	}
    }
    
    public static boolean isJavascriptReady(){
    	return gECB != null && !gECB.isEmpty() && gWebView != null;
    }
    
    @Override
    protected void pluginInitialize() {
    	gECB = null;
    	gWebView = this.webView;  
    	gForeground = true;
    }
    
    @Override
    public void onPause(boolean multitasking) {
        super.onPause(multitasking);
        gForeground = false;
    }

    @Override
    public void onResume(boolean multitasking) {
        super.onResume(multitasking);
        gForeground = true;
    }
    
    
    @Override
    public void onDestroy() {
    	gECB = null;
    	gWebView = null;
    	gForeground = false;
    	
    	super.onDestroy();
    }
    
    public static boolean isInForeground(){
      return gForeground;
    }
}
