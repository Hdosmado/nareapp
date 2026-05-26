import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/models/auth_session.dart';
import '../data/models/provider_summary.dart';
import '../services/push_service.dart';
import 'providers.dart';

/// Situación de la sesión del prestador.
enum SessionStatus {
  /// Arrancando: leyendo la sesión guardada del almacenamiento seguro.
  booting,

  /// El teléfono no está activado o la sesión se perdió.
  unauthenticated,

  /// Hay una sesión válida; la app está operativa.
  authenticated,
}

/// Estado de sesión observable por toda la app.
class SessionState {
  const SessionState({
    required this.status,
    this.provider,
    this.deviceId,
    this.justActivated = false,
  });

  final SessionStatus status;
  final ProviderSummary? provider;
  final String? deviceId;

  /// `true` solo en el instante posterior a una activación, para mostrar una
  /// vez la pantalla "Activación exitosa".
  final bool justActivated;

  bool get isAuthenticated => status == SessionStatus.authenticated;

  SessionState copyWith({
    SessionStatus? status,
    ProviderSummary? provider,
    String? deviceId,
    bool? justActivated,
  }) {
    return SessionState(
      status: status ?? this.status,
      provider: provider ?? this.provider,
      deviceId: deviceId ?? this.deviceId,
      justActivated: justActivated ?? this.justActivated,
    );
  }
}

/// Controla el ciclo de vida de la sesión: arranque, activación del teléfono,
/// login de reingreso y desvinculación. Es la fuente de verdad de si la app
/// está activada y quién es el prestador.
class SessionController extends Notifier<SessionState> {
  @override
  SessionState build() {
    // El arranque es asíncrono; se dispara una sola vez tras construir.
    Future.microtask(_bootstrap);
    return const SessionState(status: SessionStatus.booting);
  }

  Future<void> _bootstrap() async {
    final store = ref.read(sessionStoreProvider);
    final api = ref.read(apiClientProvider);

    // Aplica la URL de backend guardada (configurable sin recompilar).
    final backendUrl =
        await ref.read(serverConfigStoreProvider).effectiveUrl();
    api.setBaseUrl(backendUrl);

    final deviceId = await store.deviceId();
    api.setDeviceId(deviceId);
    api.onTokensRefreshed = (session) => store.writeSession(session);
    api.onSessionExpired = _onSessionExpired;

    final session = await store.readSession();
    if (session == null) {
      state = SessionState(
        status: SessionStatus.unauthenticated,
        deviceId: deviceId,
      );
      return;
    }

    api.setSession(session);
    state = SessionState(
      status: SessionStatus.authenticated,
      provider: session.provider,
      deviceId: deviceId,
    );
    _registerPushToken(deviceId);
  }

  /// Activa el teléfono con el código numérico de 8 dígitos.
  Future<void> activateWithCode(String code) async {
    final deviceId = await _deviceId();
    final profile =
        await ref.read(deviceIdentityProvider).resolve(deviceId);
    final push = await StubPushService(deviceId).obtainToken();
    final session = await ref
        .read(activationRepositoryProvider)
        .claimWithCode(code, profile, pushToken: push);
    await _adopt(session, deviceId, fresh: true);
  }

  /// Activa el teléfono con el token de un QR escaneado.
  Future<void> activateWithToken(String token) async {
    final deviceId = await _deviceId();
    final profile =
        await ref.read(deviceIdentityProvider).resolve(deviceId);
    final push = await StubPushService(deviceId).obtainToken();
    final session = await ref
        .read(activationRepositoryProvider)
        .claimWithToken(token, profile, pushToken: push);
    await _adopt(session, deviceId, fresh: true);
  }

  /// Reingreso con email y contraseña cuando la sesión se perdió pero el
  /// teléfono ya estuvo activado.
  Future<void> loginAgain(String email, String password) async {
    final deviceId = await _deviceId();
    final session =
        await ref.read(authRepositoryProvider).login(email, password);
    await _adopt(session, deviceId);
  }

  /// Desvincula el teléfono: borra la sesión y la cola local. Para volver a
  /// operar hay que activar la app con un código nuevo.
  Future<void> unlink() async {
    await ref.read(sessionStoreProvider).clearSession();
    await ref.read(offlineStoreProvider).replace(const []);
    ref.read(apiClientProvider).setSession(null);
    state = state.copyWith(
      status: SessionStatus.unauthenticated,
      provider: null,
    );
  }

  Future<void> _adopt(
    AuthSession session,
    String deviceId, {
    bool fresh = false,
  }) async {
    await ref.read(sessionStoreProvider).writeSession(session);
    ref.read(apiClientProvider).setSession(session);
    state = SessionState(
      status: SessionStatus.authenticated,
      provider: session.provider,
      deviceId: deviceId,
      justActivated: fresh,
    );
    _registerPushToken(deviceId);
  }

  /// Marca como vista la pantalla de activación exitosa.
  void markActivationSeen() {
    if (state.justActivated) {
      state = state.copyWith(justActivated: false);
    }
  }

  /// Registra el token de push en el backend. Best-effort: si falla, no
  /// interrumpe la sesión.
  Future<void> _registerPushToken(String deviceId) async {
    try {
      final token = await StubPushService(deviceId).obtainToken();
      if (token != null) {
        await ref.read(pushRepositoryProvider).registerToken(deviceId, token);
      }
    } catch (_) {
      // El registro de push no es crítico para operar.
    }
  }

  void _onSessionExpired() {
    if (state.status == SessionStatus.unauthenticated) return;
    ref.read(sessionStoreProvider).clearSession();
    ref.read(apiClientProvider).setSession(null);
    state = state.copyWith(
      status: SessionStatus.unauthenticated,
      provider: null,
    );
  }

  Future<String> _deviceId() async {
    return state.deviceId ?? await ref.read(sessionStoreProvider).deviceId();
  }
}

/// Proveedor global de la sesión.
final sessionControllerProvider =
    NotifierProvider<SessionController, SessionState>(SessionController.new);
