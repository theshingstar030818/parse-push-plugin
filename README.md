Parse.Push Plugin
==============================

Parse.Push plugin for Phonegap/Cordova/ionic. Works for both hosted Parse.com and open source parse-server.

[Parse.com's](http://parse.com) Javascript API has no mechanism to register a device for or receive push notifications, which
makes it fairly useless for PN in Phonegap/Cordova. This plugin bridges the gap by leveraging native Parse.com SDKs
to register/receive PNs and expose a simple API to Javascript.

* Phonegap/Cordova > 3.0

How Is This Fork Different?
--------------------------

**Works with hosted Parse.com and open source parse-sever**

**Simple Setup**

Just `cordova plugin add`, set a couple of `config.xml` tags and you're ready to go.

**Can handle cold start**

**Simple API**

* **getInstallationId**( successCB, errorCB )
* **getSubscriptions**( successCB, errorCB )
* **subscribe**( channel, successCB, errorCB )
* **unsubscribe**( channel, successCB, errorCB )

**Manage push notification via events anywhere in your code**

ParsePushPlugin makes these notification events available: `openPN, receivePN, receivePN:customEvt`.
To handle notification events in JS, do this:

```javascript
ParsePushPlugin.on('receivePN', function(pn){
	console.log('yo i got this push notification:' + JSON.stringify(pn));
});

//
// Use custom events to simulate separate communication channels using push notification.
// Just set an 'event' key in the push payload made from your server. If you set {event: "x"},
// you'll be able to catch it via "receivePn:x"
//
ParsePushPlugin.on('receivePN:chat', function(pn){
	console.log('yo i can also use custom event to keep things like chat modularized');
});
ParsePushPlugin.on('receivePN:system-maintenance', function(pn){
	console.log('yo, here is a system maintenance payload');
});

//
// When you open a notification from the system tray, `openPN` is also triggered.
// You can use it to do things like navigating to a different page or refreshing data.
ParsePushPlugin.on('openPN', function(pn){
	//you can do things like navigating to a different view here
	console.log('Yo, I get this when the user taps open a notification from the tray');
});
```


**Multiple notifications**

Android: to prevent flooding the notification tray, this plugin retains only the last PN with the same `title` field.
For messages without the `title` field, the application name is used. A count of unopened PNs is shown.

iOS: iOS handles the notification tray.


**Foreground vs. Background**

Android: Mimics the iOS behavior and create a notification when app is off or in background.
When app is in foreground, PN payloads are forwarded via the `receivePN` and `receivePN:customEvt` events.

iOS: Forward the PN payload to javascript in foreground mode. When app inactive or in background, iOS
holds PNs in the tray. Only when the user opens these PNs would we have access and forward them to javascript.


**Navigate to a specific view when user opens a notification**

If your app is already on (or in the background), you can simply perform page switching in javascript.
Simply add a `urlHash` field in your PN payload that contains either a url hash, i.e. #myhash,
or a url parameter string, i.e. ?param1=a&param2=b. Then catch that field via the `openPN` event and
go from there.

```javascript
ParsePushPlugin.on('openPN', function(pn){
	if(pn.urlHash){
		window.location.hash = hash;
	}
});
```

For cold start, you can also let your cordova app finish loading and use javascript to handle page switching.
You can also carry out the page switching while the splashscreen is still visible, thus eliminating any flicker
at the start.

Directly launching a non-default url via native code is also possible. Here are some hints on how
to do that:

*Android:* If `urlHash` starts with "#" or "?", this plugin will pass it along as an extra in the
android intent to launch your MainActivity. You can then launch the custom url in
`MainActivity.onCreate` this way:

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

*iOS:* On cold start via notification, `didFinishLaunchingWithOptions` and this plugin's `didLaunchViaNotification`
have access to the payload. Those 2 functions are good starting points for launching custom url.



Installation
------------

Read the [Parse server push guide](https://github.com/ParsePlatform/parse-server/wiki/Push) for an overview of the Push configuration.

####Install Push Certificates on Server:

- Hosted Parse.com
   - iOS
      1. Create SSL push certificate with Apple. You may find  [this tutorial useful](https://github.com/ParsePlatform/PushTutorial/tree/master/iOS). All steps prior to adding code to your iOS application are applicable.
      2. Use Parse Dashboard to upload the generated `p12` push certificate.
   - Android - no need for certificate setup. Parse.com uses its own push credentials.

- Open Source parse-server
   1. Setup `parse-server`

      There are plenty of guides out there to help you get started on popular hosting services like Heroku and AWS. If you want to setup parse-server on your laptop [for local development, here's a quick-start guide](https://taivo.github.io/guides/parse-server-for-local-development).
   2. Once you have a working `parse-server`, generate your push credentials:

      - iOS
         1. Create SSL push certificate with Apple. You may find  [this tutorial useful](https://github.com/ParsePlatform/PushTutorial/tree/master/iOS). All steps prior to adding code to your iOS application are applicable.
         2. Place the `p12` certificate file from the previous step on your server.
      - Android
         1. Get the sender id (your project number) from your google developer console. It's a long integer.
         2. Enable GCM for your project on google developer console and generate a **server API key**.
   3. Update your `parse-server` configuration to use the push credentials. Here is an example:

      ```json
      {
         "appId": "MY_APP_ID",
         "masterKey": "SUPER_SECRET",
         "cloud": "./myCloudDir/main.js",
         "push": {
            "android":{
               "senderId": "SENDER_ID_AKA_PROJECT_NUMBER",
               "apiKey": "SERVER_API_KEY_FROM_GOOGLE_DEVELOPER_CONSOLE"
            },
            "ios":{
               "pfx": "my-push-certificate.p12",
               "bundleId": "com.company.myapp",
               "production": false
            }
         }
      }
      ```
   4. Restart your `parse-server` for the new settings to take effect.


####Add Plugin

- Hosted Parse.com

   ```
   cordova plugin add https://github.com/taivo/parse-push-plugin.git#parse-com

   ```

   After this step, please use the `parse-com` branch's README to continue setting
   up the plugin for use with hosted Parse.com.


- Open Source parse-server
   For both Android and iOS, run

   ```
   cordova plugin add https://github.com/taivo/parse-push-plugin

   ```

   After adding the plugin to your project, create the following tags in `config.xml`:

   ```xml
   <!-- required -->
   <preference name="ParseAppId" value="PARSE_APPID" />
   <preference name="ParseServerUrl" value="http://PARSE_SERVER:1337/parse/" />

   <!-- required for Android -->
   <preference name="ParseGcmSenderId" value="GCM_SENDER_ID" />
   ```

   To get your GCM sender ID, enable GCM for your Android project in the Google Developer Console. Take note of your
   project number. It should be a large integer like 123427208255. This project number is your GCM sender ID. It's the
   same `senderId` used in parse-server push config.

   You're all set. The plugin takes care of initializing Parse platform using the `config.xml` preferences mentioned above.
   To customize push notifications, initialize Parse platform yourself, or use your own `MainApplication.java` in Android,
   see the [Advanced Configuration](#advanced-configuration) section.

Usage
-----

When your app starts, ParsePushPlugin automatically obtains and stores necessary device tokens to your native `ParseInstallation`.
This plugin also registers a javascript callback that will be triggered when a push notification is received or opened on the native side.
This setup enables the following simple API and event handling.

**API**


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
	//you can also listen to your own custom events
	// Note: to push custom event, include 'event' key in your push payload,
   // e.g. {alert: "sup", event:'chat'}
	ParsePushPlugin.on('receivePN:chat', chatEventHandler);
	ParsePushPlugin.on('receivePN:serverMaintenance', serverMaintenanceHandler);
}
```


**Silent Notifications**

For Android, a silent notification can be sent by omitting the `title` and `alert` fields in the
JSON payload. This means the push notification will not be shown in the system tray, but its JSON
payload will still be delivered to your `receivePN` and `receivePN:customEvt` handlers.


Advanced Configuration
----------------------
####Android:

The actual code that handles Parse platform initialization is in [ParsePushApplication.java](src/android/ParsePushApplication.java).

Android knows to use this class due to the attribute `android:name` in `<application>` in 'platforms/android/AndroidManifest.xml'.
To preserve your customizations, this plugin sets `android:name="github.taivo.parsepushplugin.ParsePushApplication"`  
if and only if `android:name` is not already defined. It does this during plugin installation. Similarly, when the plugin is
uninstalled, `android:name` will be removed only if its content matches `github.taivo.parsepushplugin.ParsePushApplication` exactly.

If you use your own Application class, don't forget to update `android:name` to point to it.

*Optional: Write your own MainApplication and/or initialize Parse yourself:* Look at [ParsePushApplication.java](src/android/ParsePushApplication.java).
The comments contain all the explanations and hints you will need. Mimic the code to write your own customized implementation.

*Optional: Customize background color for the push notification icon in Android Lollipop:* Go to your `platforms/android/res/values` folder and create a file named `colors.xml`. Paste the following content in it and replace the hex color value of the form `#AARRGGBB` to your liking.

   ```xml
	   <?xml version="1.0" encoding="utf-8"?>
      <resources>
         <color name="parse_push_icon_color">#ff112233</color>
      </resources>
   ```


####iOS:

If you want to customize your notification settings, use the method `didFinishLaunchingWithOptions`
in [AppDelegate+parsepush.m](src/ios/AppDelegate+parsepush.m) as a guide to modify the same method in
your `platforms/ios/ProjectName/Classes/AppDelegate.m`.

When you initialize Parse from `platforms/ios/ProjectName/Classes/AppDelegate.m`, this plugin will
skip it's own version of Parse initialization and notification setup, that way it won't override
your customization.


Troubleshooting
---------------
####Android:

- If you run into this error during build

   ```
   > Could not resolve all dependencies for configuration ':_debugCompile'.
      > Could not find any version that matches com.android.support:support-v4:+.
        Searched in the following locations:
            https://repo1.maven.org/maven2/com/android/support/support-v4/maven-metadata.xml
            https://repo1.maven.org/maven2/com/android/support/support-v4/
        Required by:
            :android:unspecified
   ```

   Update your android SDK installation to include android-extra:

   ```bash

   android update sdk --no-ui --filter extra

   ```


- Starting with the Parse Android SDK v1.10.1 update, your app may crash at start and the log says something about a missing method in OkHttpClient. Just update the cordova libs of your project
via `cordova platform update android`. If your previous cordova libs are old, you may run into further compilation errors that has to do with the new cordova libs setting your android target to be 22 or higher. Look at file `platforms/android/project.properties` and make sure that is
consistent with your `config.xml`

####iOS:

This plugin takes advantage of the `cordova.exec` bridge. If calls to `cordova.exec` only gets triggered after pressing your device's Home button, try inspecting your Content-Security-Policy. Your `frame-src` must allow `gap:` because the cordova bridge on iOS works via Iframe.
