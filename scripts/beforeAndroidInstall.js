//
// Note: use before_plugin_install hook instead of after_plugin_install.
// Cordova generates its own version of AndroidManifest and saves it after the after_plugin_install hook
// so our updates would be overwritten. This is true for Cordova 5.4.1.
//
var DefaultApplicationClassName = ["com.phonegap.parsepushplugin", "ParsePushApplication"].join('.');

module.exports = function(context) {
   var path = context.requireCordovaModule('path');
   var ConfigFile = context.requireCordovaModule("cordova-common").ConfigFile;

   var androidPrjDir = path.join(context.opts.projectRoot, 'platforms/android');
   var androidManifest = new ConfigFile(androidPrjDir, 'android', 'AndroidManifest.xml');

   //
   // set android:name attrib on <application> tag to point to the class that initializes Parse.Push for cold start.
   // Note: preserve user customization and write android:name IFF the attribute doesn't exist.
   //
   var applicationNode = androidManifest.data.find('application');
   if(applicationNode.get('android:name') === undefined){
      applicationNode.set('android:name', DefaultApplicationClassName);
      androidManifest.save();
   }

   return true;
}
