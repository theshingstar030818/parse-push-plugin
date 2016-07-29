var jstz = require('parse-push-plugin.jsTimezoneDetect');
var pushNotifications = Windows.Networking.PushNotifications;
var localSettings = Windows.Storage.ApplicationData.current.localSettings.values;

cordova.commandProxy.add("ParsePushPlugin", {
    registerCallback: function (successCb, errorCb) {
        var pnCallback = successCb;

       //localSettings.remove(ParseUtil._installationKey);

        ParseUtil.initializeViaConfigXML();

        WNSUtil.registerChannelAsync(pnCallback).then(function (channel) {
            ParseUtil.saveInstallationAsync(channel);
        }, function (err) {
            console.error("Unable to register WNS channel. Error: " + JSON.stringify(err));
            errorCb(err);
        });
    },

    getInstallationId: function (successCb, errorCb) {
        var installation = ParseUtil.getCurrentInstallation();

        if (installation.objectId) {
            successCb(installation.installationId);
        } else {
            var msg = "You don't have a stored installation";
            console.error(msg);
            errorCb(msg);
        }
    },

    getInstallationObjectId: function(){
        var installation = ParseUtil.getCurrentInstallation();

        if (installation.objectId) {
            successCb(installation.objectId);
        } else {
            var msg = "You don't have a stored installation";
            console.error(msg);
            errorCb(msg);
        }
    },

    getSubscriptions: function(successCb, errorCb){
        successCb(ParseUtil.getCurrentInstallation().channels || []);
    },
    subscribe: function (successCb, errorCb, argArray) {
        var channel = argArray[0];

        ParseUtil.subscribeAsync(channel).then(function () {
            successCb()
        }, errorCb);
    },
    unsubscribe: function(successCb, errorCb, argArray){
        var channel = argArray[0];

        ParseUtil.unsubscribeAsync(channel).then(function () {
            successCb()
        }, errorCb);
    },
    register: function(successCb, errorCb){
        //noop
    }
});


var ParseUtil = {
    _installationKey: "ParsePushPluginInstallation",
    _parseVersion: "1.7.0.0", //we're actually using the REST api, so this is just a filler
    _serverUrl: null,
    _xhrHeaders: {},

    _hexOctet: function () {
        return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    },
    _generateId: function () {
        return this._hexOctet() + this._hexOctet() + '-'
            + this._hexOctet() + '-'
            + this._hexOctet() + '-'
            + this._hexOctet() + '-'
            + this._hexOctet() + this._hexOctet() + this._hexOctet();
    },
    _formUrl: function(tail){
        return [this._serverUrl, tail].join('');
    },

    initializeViaConfigXML: function(){
        this._xhrHeaders = {
            "Content-Type": "application/json",
            "X-Parse-Application-Id": CordovaUtil.getPreference("ParseAppId")
        };

        this._serverUrl = CordovaUtil.getPreference("ParseServerUrl");
        if (this._serverUrl === "PARSE_DOT_COM") {
            //legacy mode
            this._serverUrl = "https://api.parse.com/1/";
            this._xhrHeaders["X-Parse-Windows-Key"] = CordovaUtil.getPreference("ParseWindowsKey");
        }

        if (!this._serverUrl.endsWith('/')) {
            this._serverUrl += '/';
        }
    },

    getCurrentInstallation: function(){
        var stringCache = localSettings[ParseUtil._installationKey];
        if (stringCache) {
            return JSON.parse(stringCache);
        } else {
            //return a new unsaved installation object
            var appMeta = CordovaUtil.getAppMeta();
            var deviceMeta = {
                deviceType: 'winrt',
                deviceUris: null, //initialized deviceUris to null, but must be set appropriately before/during save
                timeZone: LocaleUtil.getIANATimeZone(),
                localeIdentifier: LocaleUtil.getLocalId(),
            };
            var installationMeta = {
                parseVersion: ParseUtil._parseVersion,
                installationId: ParseUtil._generateId()
            };

            return Object.assign({}, appMeta, deviceMeta, installationMeta);
        }
    },

    _updateInstallationAsync: function (installationData) {
        console.log("db-update installation objectId: " + installationData.objectId);
        return WinJS.xhr({
            type: "PUT",
            url: ParseUtil._formUrl('installations/' + installationData.objectId),
            headers: ParseUtil._xhrHeaders,
            data: JSON.stringify(installationData)
        });
    },
    _createInstallationAsync: function (installationData) {
        console.log("db-create new installation: " + installationData.installationId);
        return WinJS.xhr({
            type: "POST",
            url: ParseUtil._formUrl('installations'),
            headers: ParseUtil._xhrHeaders,
            data: JSON.stringify(installationData)
        });
    },
    _saveLocalInstallation: function (installationData) {
        //
        // save to WinJS's local storage mechanism
        localSettings[this._installationKey] = JSON.stringify(installationData);
    },
    saveInstallationAsync: function (wnsChannel) {
        var installationData = this.getCurrentInstallation();

        if (wnsChannel) {
            var storedUri = (installationData.deviceUris || {})._Default;

            if (installationData.objectId && storedUri === wnsChannel.uri) {
                //
                // channel has not changed, no need to save to database
                return WinJS.Promise.as(installationData);
            } else {
                installationData.deviceUris = { _Default: wnsChannel.uri };
                var promise = (installationData.objectId) ? ParseUtil._updateInstallationAsync(installationData) : ParseUtil._createInstallationAsync(installationData);

                //
                // store newly saved object to local settings cache
                return promise.then(function (xhr) {
                    var response = JSON.parse(xhr.response);
                    if (response.objectId) {
                        installationData.objectId = response.objectId;
                    }

                    ParseUtil._saveLocalInstallation(installationData);
                    return installationData;
                });
            }
        } else {
            throw "Missing parameter 'wnsChannel'";
        }
    },
    subscribeAsync: function (channel) {
        var installationData = ParseUtil.getCurrentInstallation();

        if (!installationData || !installationData.objectId) {
            var msg = "You have not saved an installation. Can't subscribe.";
            console.error(msg);
            return WinJS.Promise.wrapError(msg);
        }

        if (!installationData.channels)
            installationData.channels = [];

        if (installationData.channels.indexOf(channel) > -1) {
            console.log("Noop. Already subscribed to channel: " + channel);
            return WinJS.Promise.as(true);
        } else {
            installationData.channels.push(channel);
        }

        return ParseUtil._updateChannelsAsync(installationData);
    },
    unsubscribeAsync: function (channel) {
        var installationData = ParseUtil.getCurrentInstallation();

        if (!installationData || !installationData.objectId) {
            var msg = "You have not saved an installation. Can't unsubscribe.";
            console.error(msg);
            return WinJS.Promise.wrapError(msg);
        }

        if (!installationData.channels) {
            var msg = "You have not subscribed to any channel. Can't unsubscribe";
            console.warn(msg);
            return WinJS.Promise.wrapError(msg);
        }

        var index = installationData.channels.indexOf(channel);
        if (index >= 0) {
            installationData.channels.splice(index, 1);
        } else {
            var msg = "You are not subscribed to: '" + channel + "'. Can't unsubscribe";
            console.warn(msg);
            return WinJS.Promise.wrapError(msg);
        }

        return ParseUtil._updateChannelsAsync(installationData);
    },
    _updateChannelsAsync: function (installationData) {
        return WinJS.xhr({
            type: "PUT",
            url: ParseUtil._formUrl('installations/' + installationData.objectId),
            headers: ParseUtil._xhrHeaders,
            data: JSON.stringify({ channels: installationData.channels })
        }).then(function (xhr) {
            ParseUtil._saveLocalInstallation(installationData);
            return true;
        });
    }
};


var WNSUtil = {
    registerChannelAsync: function (pnCallback) {
        //
        // Note: WNS channels can expire (30 days) and a call to createPushNotificationChannelForApplicationAsync() may return
        // a new channel so call this function each time the app starts. Let MS take care of returning same channel
        // or new one.
        //
        // Readings:
        // https://msdn.microsoft.com/en-us/windows/uwp/controls-and-patterns/tiles-and-notifications-windows-push-notification-services--wns--overview
        // https://msdn.microsoft.com/en-us/library/windows/apps/hh465412.aspx
        //

        var onPushReceive = function(e) {
            debugger;
            console.log("***** ONPUSH RECEIVE", e);
            WNSUtil._onPushReceive(e, pnCallback);
        }

        return pushNotifications.PushNotificationChannelManager.createPushNotificationChannelForApplicationAsync().then(
            function (wnsChannel) {
                wnsChannel.addEventListener("pushnotificationreceived", onPushReceive);
                wnsChannel.onpushnotificationreceived = onPushReceive;

                console.log('channel', wnsChannel);

                WNSUtil.channel = wnsChannel; //save channel so we can unregister events


                //var context = cordova.require('cordova/platform').activationContext;
                //console.log('CONTEXt', context);

                return wnsChannel;
            }
        );
    },

    _onPushReceive: function (e, pnCallback) {
        var pnPayload;

        switch (e.notificationType) {
            case pushNotifications.PushNotificationType.toast:
                console.log('toast', e);
                pnPayload = e.toastNotification.content.getXml();
                break;

            case pushNotifications.PushNotificationType.tile:
                console.log('tile', e);
                pnPayload = e.tileNotification.content.getXml();
                break;

            case pushNotifications.PushNotificationType.badge:
                console.log('badge', e);
                pnPayload = e.badgeNotification.content.getXml();
                break;

            case pushNotifications.PushNotificationType.raw:
                console.log('raw', e);
                pnPayload = e.rawNotification.content;
                break;
        }

        console.log('payload', pnPayload);
        e.cancel = true;

        pnCallback(pnPayload, "RECEIVE");
    }
};

var CordovaUtil = {
    _configXML: null,
    getConfigXML: function () {
        if (!this._configXML) {
            //
            // load configXML synchronously.
            // making this synchronous simplifies the rest of the code because the rest of
            // the code depends on these config parameters
            //
            var req = new XMLHttpRequest();
            req.open("GET", "../config.xml", false); //false -> synchronous
            req.send();
            this._configXML =req.responseXML.querySelector("widget");
        }
        return this._configXML;
    },
    getAppMeta: function(){
        var configXML = this.getConfigXML();
        return {
            appName: configXML.querySelector("name").textContent,
            appIdentifier: configXML.getAttribute("id"),
            appVersion: configXML.getAttribute("version"),
        }
    },
    getPreference: function(name){
        var configXML = this.getConfigXML();
        var selector = "preference[name='" + name + "']";

        return configXML.querySelector(selector).getAttribute("value");
    },
    getPreferences: function (prefNames) {
        //
        // Input: array of preference names
        // Output: Object of preferences with preference names as keys
        //
        var configXML = this.getConfigXML();

        var prefs = {};
        prefNames.forEach(function (name) {
            var selector = "preference[name='" + name + "']";
            prefs[name] = configXML.querySelector(selector).getAttribute("value");
        });
        return prefs;
    }
}

var LocaleUtil = {
    getLocalId: function(){
        return Intl.DateTimeFormat().resolvedOptions().locale || navigator.browserLanguage || navigator.language;
    },
    getIANATimeZone: function(){
        return jstz.determine().name();
    }
}
