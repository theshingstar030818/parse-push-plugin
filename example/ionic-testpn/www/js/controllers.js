angular.module('testpn.controllers', [])

.controller('TestPushCtrl', function($scope, $ionicPlatform, $timeout) {
   angular.extend($scope, {
      deviceInstallationId: "--",
      getInstallationIdInProgress: false,
      verifyServerRes: "",
      verifyServerInProgress: false,
      textPushRes: "",
      textPushInProgress: false,
      textMsg: "",

      pnReceived: "",
      pnReceivedChat: "", //to demonstrate custom event
      pnOpened: "",

      delayPushSeconds: 0
   });

   $timeout(function(){
      $scope.verifyServerConnection();
   });

   angular.extend($scope, {
      verifyServerConnection: function(){
         $scope.verifyServerInProgress = true;
         Parse.Cloud.run('verifyServerConnection', {}).then(
            function(res){
               $scope.verifyServerRes = res;
            },
            function(){
               $scope.verifyServerRes = "error: " + JSON.stringify(arguments);
            }
         ).always(function(){
            $scope.verifyServerInProgress = false;
            $scope.$applyAsync();
         })
      },
      pushText: function(){
         var textPayload = $scope.textMsg.length ? $scope.textMsg : "Hello via Parse.Push";
         $scope._pushText('pushText', textPayload);
      },
      pushChat: function(){
         var textPayload = $scope.textMsg.length ? $scope.textMsg : "Testing 'chat' event";
         $scope._pushText('pushChat', textPayload);
      },
      _pushText: function(cloudFuncName, textPayload){
         $scope.clearPushResults();

         Parse.Cloud.run(cloudFuncName, {textMsg: textPayload, delayMs: Number($scope.delayPushSeconds) * 1000}).then(
            function(res){
               console.log('_pushText success: ' + JSON.stringify(res));
               $scope.textPushRes = res;
            },
            function(){
               console.error(arguments);
               $scope.textPushRes = "_pushText error: " + JSON.stringify(arguments);
            }
         ).always(function(){
            $scope.textPushInProgress = false;
            $scope.$applyAsync();
         })
      },
      clearPushResults: function(){
         $scope.textPushRes = "";
         $scope.pnReceived = "";
         $scope.pnReceivedChat = "";
         $scope.pnOpened = "";
      }
   });


   //
   // ParsePushPlugin examples
   $ionicPlatform.ready(function() {
      if(window.ParsePushPlugin){
         $scope.getInstallationIdInProgress = true;
         ParsePushPlugin.getInstallationId(function(id) {
            $scope.deviceInstallationId = id;
            $scope.getInstallationIdInProgress = false;
            $scope.$applyAsync();
         }, function(e) {
            $scope.deviceInstallationId = "error: " + JSON.stringify(e);
            $scope.getInstallationIdInProgress = false;
            $scope.$applyAsync();
         });

         //
         // Setup some pn event handlers
         //
         ParsePushPlugin.on('receivePN', function(pn){
            console.log('yo i got this push notification:' + JSON.stringify(pn));
            $scope.pnReceived = pn
            $scope.$applyAsync();
         });

         ParsePushPlugin.on('receivePN:chat', function(pn){
            console.log('custom event triggered: ' + JSON.stringify(pn));
            $scope.pnReceivedChat = pn;
            $scope.$applyAsync();
         });

         ParsePushPlugin.on('openPN', function(pn){
            console.log('The user opened a notification:' + JSON.stringify(pn));
            alert('You just opened a PN: ' + JSON.stringify(pn));
            $scope.pnOpened = pn;
            $scope.$applyAsync();
         });
      }
   });
});
