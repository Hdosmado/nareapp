import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/api/api_client.dart';
import '../data/models/mobile_config.dart';
import '../data/repositories/activation_repository.dart';
import '../data/repositories/assignments_repository.dart';
import '../data/repositories/attendance_repository.dart';
import '../data/repositories/auth_repository.dart';
import '../data/repositories/config_repository.dart';
import '../data/repositories/push_repository.dart';
import '../data/repositories/sync_repository.dart';
import '../data/storage/config_store.dart';
import '../data/storage/offline_store.dart';
import '../data/storage/server_config_store.dart';
import '../data/storage/session_store.dart';
import '../services/connectivity_service.dart';
import '../services/device_identity.dart';
import '../services/location_service.dart';

/// Proveedores de infraestructura (almacenamiento, cliente HTTP, servicios y
/// repositorios). Son las hojas del árbol de dependencias: los controladores
/// de estado los consumen pero no al revés.

// ---------- Almacenamiento ----------
final sessionStoreProvider = Provider<SessionStore>((ref) => SessionStore());
final offlineStoreProvider = Provider<OfflineStore>((ref) => OfflineStore());
final configStoreProvider = Provider<ConfigStore>((ref) => ConfigStore());
final serverConfigStoreProvider =
    Provider<ServerConfigStore>((ref) => ServerConfigStore());

// ---------- Cliente HTTP ----------
final apiClientProvider = Provider<ApiClient>((ref) => ApiClient());

// ---------- Servicios de plataforma ----------
final connectivityServiceProvider =
    Provider<ConnectivityService>((ref) => ConnectivityService());
final locationServiceProvider =
    Provider<LocationService>((ref) => LocationService());
final deviceIdentityProvider =
    Provider<DeviceIdentity>((ref) => DeviceIdentity());

/// Estado de conexión observable; alimenta el modo offline-first.
final connectivityStreamProvider = StreamProvider<bool>((ref) {
  return ref.watch(connectivityServiceProvider).onStatusChange;
});

// ---------- Repositorios ----------
final authRepositoryProvider = Provider<AuthRepository>(
  (ref) => AuthRepository(ref.watch(apiClientProvider)),
);
final activationRepositoryProvider = Provider<ActivationRepository>(
  (ref) => ActivationRepository(ref.watch(apiClientProvider)),
);
final assignmentsRepositoryProvider = Provider<AssignmentsRepository>(
  (ref) => AssignmentsRepository(ref.watch(apiClientProvider)),
);
final attendanceRepositoryProvider = Provider<AttendanceRepository>(
  (ref) => AttendanceRepository(ref.watch(apiClientProvider)),
);
final syncRepositoryProvider = Provider<SyncRepository>(
  (ref) => SyncRepository(ref.watch(apiClientProvider)),
);
final pushRepositoryProvider = Provider<PushRepository>(
  (ref) => PushRepository(ref.watch(apiClientProvider)),
);
final configRepositoryProvider = Provider<ConfigRepository>(
  (ref) => ConfigRepository(
    ref.watch(apiClientProvider),
    ref.watch(configStoreProvider),
  ),
);

/// Configuración operativa de la app (ventana de tracking, radio de geocerca).
/// Cae en la caché local o en los valores por defecto si no hay conexión.
final mobileConfigProvider = FutureProvider<MobileConfig>((ref) {
  return ref.watch(configRepositoryProvider).load();
});
