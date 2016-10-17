module.exports = function(context) {
   //
   // Copy gcm sender id from config.xml into AndroidManifest
   //

   var path = context.requireCordovaModule('path');
   var ET = context.requireCordovaModule('elementtree');
   var ConfigFile = context.requireCordovaModule("cordova-common").ConfigFile;

   var configXml = new ConfigFile(context.opts.projectRoot, null, './config.xml');

   //
   // detect parse.com or parse-server mode
   var parseServerUrl = configXml.data.find('preference[@name="ParseServerUrl"]').get('value');

   if(parseServerUrl.toUpperCase() !== "PARSE_DOT_COM"){
      //
      //opensource parse-server requires own GcmSenderId, so copy it from config.xml to AndroidManifest
      //
      var configXmlGcmIdNode = configXml.data.find('preference[@name="ParseGcmSenderId"]');
      if(!configXmlGcmIdNode){
         console.error("ParseGcmSenderId is not set in config.xml");
         return false;
      }

      //
      // find the meta-data node in AndroidManifest.xml to copy the sender id into
      //
      var androidPrjDir = path.join(context.opts.projectRoot, 'platforms/android');
      var androidManifest = new ConfigFile(androidPrjDir, 'android', 'AndroidManifest.xml');

      var applicationNode = androidManifest.data.find('application');
      var manifestGcmIdNode = applicationNode.find('meta-data[@android:name="com.parse.push.gcm_sender_id"]');

      if(!manifestGcmIdNode){
         manifestGcmIdNode = new ET.Element('meta-data', {'android:name': 'com.parse.push.gcm_sender_id'});
         applicationNode.append( manifestGcmIdNode );
      }

      manifestGcmIdNode.set('android:value', 'id:' + configXmlGcmIdNode.get('value'));
      androidManifest.save();
   }




   return true;
}
