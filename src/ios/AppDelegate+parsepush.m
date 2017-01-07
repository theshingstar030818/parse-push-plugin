#import "AppDelegate+parsepush.h"
#import "ParsePushPlugin.h"

#import <Parse/Parse.h>
#import <objc/runtime.h>

@implementation AppDelegate(parsepush)
void MethodSwizzle(Class c, SEL originalSelector) {
    NSString *selectorString = NSStringFromSelector(originalSelector);
    SEL newSelector = NSSelectorFromString([@"swizzled_" stringByAppendingString:selectorString]);
    SEL noopSelector = NSSelectorFromString([@"noop_" stringByAppendingString:selectorString]);
    Method originalMethod, newMethod, noop;
    originalMethod = class_getInstanceMethod(c, originalSelector);
    newMethod = class_getInstanceMethod(c, newSelector);
    noop = class_getInstanceMethod(c, noopSelector);
    if (class_addMethod(c, originalSelector, method_getImplementation(newMethod), method_getTypeEncoding(newMethod))) {
        class_replaceMethod(c, newSelector, method_getImplementation(originalMethod) ?: method_getImplementation(noop), method_getTypeEncoding(originalMethod));
    } else {
        method_exchangeImplementations(originalMethod, newMethod);
    }
}

+ (void)load
{
    MethodSwizzle([self class], @selector(init));
    MethodSwizzle([self class], @selector(application:didFinishLaunchingWithOptions:));
    MethodSwizzle([self class], @selector(application:didRegisterForRemoteNotificationsWithDeviceToken:));
    MethodSwizzle([self class], @selector(application:didReceiveRemoteNotification:));
}

//
// noop defaults for the swizzling mechanism
//
- (void)noop_application:(UIApplication *)application didRegisterForRemoteNotificationsWithDeviceToken:(NSData *)newDeviceToken {}
- (void)noop_application:(UIApplication *)application didReceiveRemoteNotification:(NSDictionary *)userInfo {}


- (id)getParsePluginInstance
{
    return [self.viewController getCommandInstance:@"ParsePushPlugin"];
}

- (id)swizzled_init
{
    //
    // setup observer to handle notification on cold-start
    [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(didLaunchViaNotification:)
                                                 name:@"UIApplicationDidFinishLaunchingNotification" object:nil];
    return [self swizzled_init];
}


- (void)didLaunchViaNotification:(NSNotification *)notification
{
   //
   // handle the notification on cold start
   //
   if(notification.userInfo){
      //
      // on cold start, the userInfo is actually wrapped like this:
      //
      // UIApplicationLaunchOptionsRemoteNotificationKey =     {
      //     aps =         {
      //         alert = msg;
      //     };
      // };
      //
      // So we unwrap it before passing to jsCallback
      //
      NSDictionary* unwrappedInfo = [notification.userInfo objectForKey:@"UIApplicationLaunchOptionsRemoteNotificationKey"];

      ParsePushPlugin* pluginInstance = [self getParsePluginInstance];
      [pluginInstance jsCallback:unwrappedInfo withAction:@"OPEN"];
  } //else no userInfo -> noop
}

- (BOOL)swizzled_application:(UIApplication*)application didFinishLaunchingWithOptions:(NSDictionary*)launchOptions
{
   BOOL isOk = [self swizzled_application:application didFinishLaunchingWithOptions:launchOptions];

   @try {
      // test if Parse client has been initialized in the main AppDelegate.m
      NSLog(@"Custom Parse.Push init already took place. appId: %@", [Parse getApplicationId]);
   } @catch (NSException *exception) {
      //
      // default Parse Push setup. For custom setup, initialize the Parse client and
      // notification settings yourself in your main AppDelegate.m 's didFinishLaunchingWithOptions
      //
      ParsePushPlugin* pluginInstance = [self getParsePluginInstance];

      NSString *appId      = [pluginInstance getConfigForKey:@"ParseAppId"];
      NSString *serverUrl  = [pluginInstance getConfigForKey:@"ParseServerUrl"];
      NSString *clientKey  = [pluginInstance getConfigForKey:@"ParseClientKey"];
      NSString *autoReg = [pluginInstance getConfigForKey:@"ParseAutoRegistration"];

      if(!appId.length){
         NSException* invalidSettingException = [NSException
           exceptionWithName:@"invalidSettingException"
           reason:@"Please set \"appId\" with a preference tag in config.xml"
           userInfo:nil];
         @throw invalidSettingException;
      }

      if(!serverUrl.length){
         NSException* invalidSettingException = [NSException
           exceptionWithName:@"invalidSettingException"
           reason:@"Please set \"ParseServerUrl\" with a preference tag in config.xml"
           userInfo:nil];
         @throw invalidSettingException;
      }

      if( [@"PARSE_DOT_COM" caseInsensitiveCompare:serverUrl] == NSOrderedSame ) {
         //
         // initialize for use with parse.com
         //
         [Parse setApplicationId:appId clientKey:clientKey];
      } else{
         //
         // initialize for use with opensource parse-server
         //
         [Parse initializeWithConfiguration:[ParseClientConfiguration configurationWithBlock:^(id<ParseMutableClientConfiguration> configuration) {
            configuration.applicationId = appId;
            configuration.server = serverUrl;
            configuration.clientKey = clientKey;
         }]];
      }

      if(!autoReg.length || [autoReg caseInsensitiveCompare:@"true"] == 0 || [application isRegisteredForRemoteNotifications]){
          // if autoReg is true or nonexistent (defaults to true)
          // or app already registered for PN, do/redo registration
          //
          // Note: redo registration because APNS device token can change and Apple
          // suggests re-registering on each app start. registerForPN() is idempotent so
          // no worries if it gets called multiple times.
          [pluginInstance registerForPN];
      }
	}

   return isOk;
}

- (void)swizzled_application:(UIApplication *)application didRegisterForRemoteNotificationsWithDeviceToken:(NSData *)newDeviceToken
{
    NSLog(@"PN registration successful. Saving device token to installation");
    //
    // Call existing method in case it's already defined in main project's AppDelegate
    [self swizzled_application:application didRegisterForRemoteNotificationsWithDeviceToken:newDeviceToken];

    //
    // Save device token
    [ParsePushPlugin saveDeviceTokenToInstallation:newDeviceToken];
}

- (void)swizzled_application:(UIApplication *)application didReceiveRemoteNotification:(NSDictionary *)userInfo
{
   /*
      Standard iOS fields: (alert, badge, sound, content-available, category) will automatically be moved (by Parse.Push or by Apple?)
      into the "aps" field of the payload.

      So if you pushed: {alert: "testing 1 2 3", customField: "custom content"},
      the userInfo dictionary received here would be {aps: {alert: "testing 1 2 3"}, customField: "custom content"}

      For more info, see https://developer.apple.com/library/ios/documentation/NetworkingInternet/Conceptual/RemoteNotificationsPG/Chapters/TheNotificationPayload.html
   */

   [self swizzled_application:application didReceiveRemoteNotification:userInfo];

   if (application.applicationState != UIApplicationStateActive) {
      // The application was just brought from the background to the foreground,
      // so we consider the app as having been "opened by a push notification."
      [PFAnalytics trackAppOpenedWithRemoteNotificationPayload:userInfo];
   }

   //
   // PN can either be opened by user or received directly by app:
   // PN can only be received directly by app when app is running in foreground, UIApplicationStateActive.
   // PN that arrived when app is not running or in background (UIApplicationStateInactive or UIApplicationStateBackground)
   //    must be opened by user to reach this part of the code
   ParsePushPlugin* pluginInstance = [self getParsePluginInstance];
   [pluginInstance jsCallback:userInfo withAction:(application.applicationState == UIApplicationStateActive) ? @"RECEIVE" : @"OPEN"];
}
@end
