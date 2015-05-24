var serviceName = 'ParsePushPlugin';

var _ = window._ ? window._ : Parse._;

var ParsePushPlugin = {
	 _eventKey: null,
	 _onNotify: function(pn, pushAction){
		 if(pushAction === 'OPEN'){
			 //
			 // trigger a callback when user click open a notification.
			 // One usecase for this pertains a cordova app that is already running in the background.
			 // Relaying a push OPEN action, allows the app to resume and use javascript to navigate
			 // to a different screen.
			 //
			 this.trigger('openPN', pn);
		 } else{
			 //
			 //an eventKey can be registered with the register() function to trigger
			 //additional javascript callbacks when a notification is received.
			 //This helps modularizes notification handling for different aspects
			 //of your javascript app, e.g., receivePN:chat, receivePN:system, etc.
			 //
			 var base = 'receivePN';
			 this.trigger(base, pn);
			 if(this._eventKey && pn[this._eventKey]){
				 this.trigger(base + ':' + pn[this._eventKey], pn);
			 }
		 }
		 
	 },
	 
    register: function(regParams, successCb, errorCb) {
       var params = _.extend({ecb: serviceName + '._onNotify'}, regParams || {});
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
