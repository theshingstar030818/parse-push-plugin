module.exports = function(context) {
   //
   // Copy gcm sender id from config.xml into AndroidManifest
   //

   var path = context.requireCordovaModule('path');
   var ConfigFile = context.requireCordovaModule("cordova-common").ConfigFile;

   //
   // find ParseGcmSenderId setting in config.xml
   //
   var configXml = new ConfigFile(context.opts.projectRoot, null, 'config.xml');
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
   var manifestGcmIdNode = androidManifest.data.find('application/meta-data[@android:name="com.parse.push.gcm_sender_id"]');

   if(!manifestGcmIdNode){
      console.error("<meta-data android:name='com.parse.push.gcm_sender_id' > setting does not exist. Check your AndroidManifest.xml ");
      return false;
   }

   //
   // The value format is "id:$GCM_SENDER_ID"
   //
   manifestGcmIdNode.set('android:value', 'id:' + configXmlGcmIdNode.get('value'));
   androidManifest.save();

   return true;
}
