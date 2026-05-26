import 'dart:io';

import 'package:device_info_plus/device_info_plus.dart';

import '../core/config/env.dart';

/// Datos de identidad del dispositivo que la app reporta al backend al
/// activarse (`/mobile/activation/claim`).
class DeviceProfile {
  const DeviceProfile({
    required this.deviceId,
    required this.platform,
    required this.model,
    required this.osVersion,
    required this.appVersion,
  });

  final String deviceId;
  final String platform;
  final String model;
  final String osVersion;
  final String appVersion;
}

/// Resuelve el modelo, la versión de SO y la plataforma del teléfono.
/// El `deviceId` lógico lo administra `SessionStore`; acá se recibe ya
/// resuelto para armar el perfil completo.
class DeviceIdentity {
  final DeviceInfoPlugin _plugin = DeviceInfoPlugin();

  Future<DeviceProfile> resolve(String deviceId) async {
    var model = 'Desconocido';
    var osVersion = 'Desconocida';
    var platform = 'android';

    try {
      if (Platform.isAndroid) {
        final info = await _plugin.androidInfo;
        model = '${info.brand} ${info.model}'.trim();
        osVersion = 'Android ${info.version.release}';
        platform = 'android';
      } else if (Platform.isIOS) {
        final info = await _plugin.iosInfo;
        model = info.utsname.machine;
        osVersion = 'iOS ${info.systemVersion}';
        platform = 'ios';
      }
    } catch (_) {
      // Sin permisos o plugin no disponible: se reportan los valores neutros.
    }

    return DeviceProfile(
      deviceId: deviceId,
      platform: platform,
      model: model,
      osVersion: osVersion,
      appVersion: Env.appVersion,
    );
  }
}
