// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
angular.module('testpn', ['ionic', 'testpn.controllers'])

.run(function($ionicPlatform) {
   Parse.serverURL = 'http://localhost:1337/parse/';
   Parse.initialize('TESTPN');

   //
   // Default ionic stuff, not relevant to TESTPN
   //
   $ionicPlatform.ready(function() {
      if(window.cordova && window.cordova.plugins.Keyboard) {
         cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
         cordova.plugins.Keyboard.disableScroll(true);
      }
      if(window.StatusBar) {
         StatusBar.styleDefault();
      }
   });
})
