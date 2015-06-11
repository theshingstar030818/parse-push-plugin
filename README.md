Phonegap Parse.com Plugin
=========================

Phonegap 3.x plugin for Parse.com push service.

[Parse.com's](http://parse.com) Javascript API has no mechanism to register a device for or receive push notifications, which
makes it fairly useless for PN in Phonegap/Cordova. This plugin bridges the gap by leveraging native Parse.com SDKs
to register/receive PNs and allow a few essential methods to be accessible from Javascript.

How Is This Fork Different?
--------------------------

**API**

This plugin exposes the following native Android API push services to JS:

* **register**( options, successCB, errorCB )   -- register the device to receive PN
* **getInstallationId**( successCB, errorCB )
* **getSubscriptions**( successCB, errorCB )
* **subscribe**( channel, successCB, errorCB )
* **unsubscribe**( channel, successCB, errorCB )

Made ParsePushPlugin inherit from Parse.Events, thus making this possible in JS.
```javascript
ParsePushPlugin.on('receivePN', function(pn){
	console.log('yo i got this push notification:' + JSON.stringify(pn));
});

ParsePushPlugin.on('receivePN:chat', function(pn){
	console.log('yo i can also use custom event to keep things like chat modularized');
});

ParsePushPlugin.on('openPN', function(pn){
	//you can do things like navigating to a different view here
	console.log('Yo, I get this when the user clicks open a notification from the tray');
});
```

**Multiple notifications**

Prevent flooding the notification tray by retaining only the last PN with the same `title` field.
For messages without the `title` field, the application name is used. A count of unopened PNs is
also shown.

**Foreground vs. Background**

Only add an entry to the notification tray if the application is not running in foreground.
The actual PN payload is always forwarded to your javascript when it is received.

**Navigate to a specific view when user opens a notification**

Simply add a `urlHash` field in your PN payload that contains either a url hash, i.e. #myhash,
or a url parameter string, i.e. ?param1=a&param2=b. If `urlHash` starts with "#" or "?",
this plugin will pass it along as an extra in the android intent to launch your MainActivity.

For the cold start case, simply do this in your `MainActivity.onCreate()`:

```java
@Override
public void onCreate(Bundle savedInstanceState)
{
    //
    // your code...
    //

    String urlHash = intent.hasExtra("urlHash") ? intent.getStringExtra("urlHash") : "";
    loadUrl(launchUrl + urlHash);
}
```

If your app is already running (in the background, for example), and you want the PN open
action to trigger navigation to a different page/view within your app, just set a handler
for the `openPN` event, like so:

```javascript
ParsePushPlugin.on('openPN', function(pn){
	if(pn.urlHash){
		window.location.hash = hash;
	}
});
```

**Platforms**

For Android, Parse SDK v1.8.1 is used. This means GCM support. No more background process `PushService` tapping
device battery to duplicate what GCM already provides.

_I've only worked on the Android support for this fork. The iOS side is not yet up to date._


Installation
------------

```
cordova plugin add https://github.com/taivo/parse-push-plugin
```
### JavaScript Libraries

Add following libraries in your `index.html`

1. [Parse.js](https://parse.com/downloads/javascript/parse-1.4.2.min.js)
2. [Underscore.js](http://underscorejs.org/underscore-min.js) (Recommended by Parse)


####Android Setup:
Phonegap/Cordova doesn't define a custom `android.app.Application`, it only defines an android `Activity`. With an `Activity` alone,
we should be able to receive PNs just fine while our app is running. However, if a PN arrives when the app is not running,
the app will be automatically invoked, and this plugin's `ParsePushPluginReceiver` runs before the `Activity` class or any javascript code
gets a chance to call `Parse.initialize()`. The result is a crash dialog. To fix this, do the following:

1. Define a custom Application class that calls `Parse.initialize()` in its `onCreate` method. This way, the Parse
subsystem gets initialized before the PN-handling code runs. Crash avoided. In your application's Java source path,
e.g., `platforms/android/src/com/example/app`, create a file named MainApplication.java and define it this way
    ```java
    package com.example.app;  //REPLACE THIS WITH YOUR package name

    import android.app.Application;
    import com.parse.Parse;
    import com.parse.ParseInstallation;

    public class MainApplication extends Application {
	    @Override
        public void onCreate() {
            super.onCreate();
            Parse.initialize(this, "YOUR_PARSE_APPID", "YOUR_PARSE_CLIENT_KEY");
            ParseInstallation.getCurrentInstallation().saveInBackground();
        }
    }
    ```
2. Now register MainApplication in AndroidManifest.xml so it's used instead of the default.
In the `<application>` tag, add the attribute `android:name="MainApplication"`. Obviously, you don't have
to name your application class this way, but you have to use the same name in 1 and 2.


####Android Without GCM support:
If you only care about GCM devices, you're good to go. Move on to the [Usage](#usage) section.

The setup above is not enough for non-GCM devices. To support them, `ParseBroadcastReceiver`
must be setup to work properly. This receiver takes care of establishing a persistent
connection that will handle PNs without GCM. Follow these steps for `ParseBroadcastReceiver` setup:

1. Add the following to your AndroidManifest.xml, inside the `<application>` tag
    ```xml
    <receiver android:name="com.parse.ParseBroadcastReceiver">
       <intent-filter>
          <action android:name="android.intent.action.BOOT_COMPLETED" />
          <action android:name="android.intent.action.USER_PRESENT" />
       </intent-filter>
    </receiver>
    ```

2. Add the following permission to AndroidManifest.xml, as a sibling of the `<application>` tag
    ```xml
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
    ```


Usage
-----
**Registering device**

Once the device is ready, call ```ParsePushPlugin.register()```. This will register the device with Parse,
you should see this reflected in your Parse control panel. Once registered, the ParsePushPlugin object
will trigger the ```receivePN``` event and optionally the ```receivePN:customEvt``` event. ```customEvt```
is the string value of a special key in your push notification. You can set that key in ```register()``` with
the option ```eventKey```.

```javascript
ParsePushPlugin.register({eventKey:"myEventKey"}, //will trigger receivePN[pnObj.myEventKey]
function() {
	alert('successfully registered device!');
}, function(e) {
	alert('error registering device: ' + e);
});
```

During initial setup, it may be useful to confirm that your push notification is hooked up properly for your
app before having to tinker with the Android setup steps involving `MainApplication.java`. You can do so by adding the keys
`appId:"PARSE_APPID", clientKey:"PARSE_CLIENT_KEY"` to the first parameter of register()



**Registering device**

After the registration is completed successfully (it's successCB has been called), you can do any of the following
```javascript
ParsePushPlugin.getInstallationId(function(id) {
    alert(id);
}, function(e) {
    alert('error');
});

ParsePushPlugin.getSubscriptions(function(subscriptions) {
    alert(subscriptions);
}, function(e) {
    alert('error');
});

ParsePushPlugin.subscribe('SampleChannel', function(msg) {
    alert('OK');
}, function(e) {
    alert('error');
});

ParsePushPlugin.unsubscribe('SampleChannel', function(msg) {
    alert('OK');
}, function(e) {
    alert('error');
});
```


**Receiving push notifications**

Anywhere in your code, you can set a listener for notification events using the ParsePushPlugin object (it extends Parse.Events).
```javascript
if(window.ParsePushPlugin){
	ParsePushPlugin.on('receivePN', function(pn){
		alert('yo i got this push notification:' + JSON.stringify(pn));
	});

	//
	//you can also listen to your own custom subevents if you registered eventKey
	//
	ParsePushPlugin.on('receivePN:chat', chatEventHandler);
	ParsePushPlugin.on('receivePN:serverMaintenance', serverMaintenanceHandler);
}
```


**Silent Notifications**

For Android, a silent notification can be sent by omitting the `title` and `alert` fields in the
JSON payload. This means the push notification will not be shown in the system tray, but its JSON
payload will still be delivered to your `receivePN` and `receivePN:customEvt` handlers.


Compatibility
-------------
Phonegap/Cordova > 3.0.0
