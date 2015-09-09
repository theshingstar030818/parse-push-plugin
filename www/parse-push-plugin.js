var serviceName = 'ParsePushPlugin';
var _ = window._ ? window._ : Parse._;

//
// establish an exec bridge so native code can call javascript
// when a PN event occurs
//
require('cordova/channel').onCordovaReady.subscribe(function() {
	require('cordova/exec')(jsCallback, null, serviceName, 'setEventCallback', []);
	
	function jsCallback(pn, pushAction) {
		if(pushAction === 'OPEN'){
			 //
			 // trigger a callback when user click open a notification.
			 // One usecase for this pertains a cordova app that is already running in the background.
			 // Relaying a push OPEN action, allows the app to resume and use javascript to navigate
			 // to a different screen.
			 //
			 ParsePushPlugin.trigger('openPN', pn);
		 } else{
			 //
			 //an eventKey can be registered with the register() function to trigger
			 //additional javascript callbacks when a notification is received.
			 //This helps modularizes notification handling for different aspects
			 //of your javascript app, e.g., receivePN:chat, receivePN:system, etc.
			 //
			 var base = 'receivePN';
			 ParsePushPlugin.trigger(base, pn);
			 if(ParsePushPlugin._eventKey && pn[this._eventKey]){
				 ParsePushPlugin.trigger(base + ':' + pn[this._eventKey], pn);
			 }
		 }
   }
});

var ParsePushPlugin = {
	 _eventKey: null,
    register: function(regParams, successCb, errorCb) {
   	 var params = regParams || {};
   	 this._eventKey = params.eventKey || null;
   	 cordova.exec(successCb, errorCb, serviceName, 'register', [params]);
    },

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
