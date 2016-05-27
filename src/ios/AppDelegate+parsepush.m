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
    [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(coldStartNotification:)
                                                 name:@"UIApplicationDidFinishLaunchingNotification" object:nil];
    return [self swizzled_init];
}


- (void)coldStartNotification:(NSNotification *)notification
{
    //
    // handle the notification on cold start
    //
    if(notification.userInfo){
        ParsePushPlugin* pluginInstance = [self getParsePluginInstance];
        [pluginInstance jsCallback:notification.userInfo withAction:@"OPEN"];
    } else{
        NSLog(@"notification has no userInfo");
    }
}

- (void)swizzled_application:(UIApplication *)application didRegisterForRemoteNotificationsWithDeviceToken:(NSData *)newDeviceToken
{
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

    //
    // Call existing method in case it's already defined in main project's AppDelegate
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
