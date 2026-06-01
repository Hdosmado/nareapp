import Flutter
import GoogleMaps
import UIKit
import UserNotifications

@main
@objc class AppDelegate: FlutterAppDelegate, FlutterImplicitEngineDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    // Google Maps API key. Se lee del Info.plist (key MAPS_API_KEY), que en
    // build se resuelve desde la User-Defined Build Setting MAPS_API_KEY del
    // proyecto Xcode (o desde un xcconfig en CI). Sin valor, el mapa carga
    // con la marca "For development purposes only". Setup detallado en
    // docs/MAPS-SETUP.md.
    if let apiKey = Bundle.main.object(forInfoDictionaryKey: "MAPS_API_KEY") as? String,
       !apiKey.isEmpty {
      GMSServices.provideAPIKey(apiKey)
    }
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  func didInitializeImplicitFlutterEngine(_ engineBridge: FlutterImplicitEngineBridge) {
    GeneratedPluginRegistrant.register(with: engineBridge.pluginRegistry)
  }

  // Presentar notificaciones aunque la app esté en primer plano. Sin esto, con
  // firebase_messaging tomando el delegate de UNUserNotificationCenter, iOS
  // suprime los banners en foreground (incluidos los avisos locales que dispara
  // la app), y no se ve nada hasta minimizar la app.
  override func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    willPresent notification: UNNotification,
    withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
  ) {
    if #available(iOS 14.0, *) {
      completionHandler([.banner, .list, .badge, .sound])
    } else {
      completionHandler([.alert, .badge, .sound])
    }
  }
}
