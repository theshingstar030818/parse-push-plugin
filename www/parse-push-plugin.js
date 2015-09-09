var serviceName = 'ParsePushPlugin';
var _ = window._ ? window._ : Parse._;

//
// establish an exec bridge so native code can call javascript
// when a PN event occurs
//
require('cordova/channel').onCordovaReady.subscribe(function() {
	require('cordova/exec')(jsCallback, null, serviceName, 'registerCallback', []);
	
	function jsCallback(pn, pushAction) {
		if(pushAction === 'OPEN'){
			 //
			 // trigger a callback when user click open a notification.
			 // One usecase for this pertains a cordova app that is already running in the background.
			 // Relaying a push OPEN action, allows the app to resume and use javascript to navigate
			 // to a different screen.
			 //
			 ParsePushPlugin.trigger(ParsePushPlugin._openEvent, pn);
		 } else{
			 //
			 //an eventKey can be registered with the register() function to trigger
			 //additional javascript callbacks when a notification is received.
			 //This helps modularizes notification handling for different aspects
			 //of your javascript app, e.g., receivePN:chat, receivePN:system, etc.
			 //
			 var base = ParsePushPlugin._receiveEvent;
			 var customEventKey = ParsePushPlugin._customEventKey;
			 
			 ParsePushPlugin.trigger(base, pn);
			 if(customEventKey && pn[customEventKey]){
				 ParsePushPlugin.trigger(base + ':' + pn[customEventKey], pn);
			 }
		 }
   }
});

var ParsePushPlugin = {
	 _openEvent: 'openPN',
	 _receiveEvent: 'receivePN',
	 _customEventKey: 'event', //default key for custom events associated with each PN, set this to anything you see fit
	 
    getInstallationId: function(successCb, errorCb) {
       cordova.exec(successCb, errorCb, serviceName, 'getInstallationId', []);
    },

    getInstallationObjectId: function(successCb, errorCb) {
       cordova.exec(successCb, errorCb, serviceName, 'getInstallationObjectId', []);
    },

    getSubscriptions: function(successCb, errorCb) {
       cordova.exec(successCb, errorCb, serviceName, 'getSubscriptions',[]);
    },

    subscribe: function(channel, successCb, errorCb) {
       cordova.exec(successCb, errorCb, serviceName, 'subscribe', [ channel ]);
    },

    unsubscribe: function(channel, successCb, errorCb) {
       cordova.exec(successCb, errorCb, serviceName, 'unsubscribe', [ channel ]);
    }
};

//
// give ParsePushPlugin event handling capability so we can use it to trigger
// push notification onReceive events
module.exports = _.extend(ParsePushPlugin, Parse.Events);