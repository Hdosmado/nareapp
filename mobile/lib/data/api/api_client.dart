import 'package:dio/dio.dart';

import '../../core/config/env.dart';
import '../models/auth_session.dart';
import 'api_exception.dart';

/// Cliente HTTP de NareApp. Centraliza:
/// - la URL base del backend (`/api`),
/// - el `Authorization: Bearer` con el access token de la sesión,
/// - el header `X-Device-Id` que exigen los endpoints operativos,
/// - el refresh automático del token ante un 401, con un solo reintento.
///
/// No conoce de UI: las pantallas hablan con los repositorios y estos con
/// este cliente.
class ApiClient {
  ApiClient() {
    _dio = Dio(
      BaseOptions(
        baseUrl: Env.apiBaseUrl,
        connectTimeout: const Duration(seconds: 12),
        receiveTimeout: const Duration(seconds: 20),
        sendTimeout: const Duration(seconds: 20),
        contentType: Headers.jsonContentType,
      ),
    );
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: _onRequest,
        onError: _onError,
      ),
    );
  }

  late final Dio _dio;

  /// URL base del backend (sin el sufijo `/api`). Configurable en runtime.
  String _backendBaseUrl = Env.backendBaseUrl;

  /// Sesión vigente. La fija [setSession]; el refresh la actualiza in situ.
  AuthSession? _session;

  /// Identificador lógico del dispositivo, enviado en `X-Device-Id`.
  String? _deviceId;

  /// Se invoca cuando se renuevan los tokens, para que la capa de estado los
  /// persista en almacenamiento seguro.
  void Function(AuthSession session)? onTokensRefreshed;

  /// Se invoca cuando la sesión es irrecuperable (refresh fallido o device
  /// revocado): la app debe volver a la pantalla de activación.
  void Function()? onSessionExpired;

  Future<bool>? _refreshInFlight;

  /// Apunta el cliente a un backend distinto, en tiempo de ejecución.
  /// [backendBaseUrl] es la URL sin el sufijo `/api` (p. ej. `http://10.0.2.2:3000`).
  void setBaseUrl(String backendBaseUrl) {
    _backendBaseUrl = backendBaseUrl.trim();
    _dio.options.baseUrl = '$_backendBaseUrl/api';
  }

  /// URL base del backend en uso.
  String get backendBaseUrl => _backendBaseUrl;

  /// Fija la sesión activa (login, activación o arranque con sesión guardada).
  void setSession(AuthSession? session) => _session = session;

  /// Fija el identificador del dispositivo.
  void setDeviceId(String? deviceId) => _deviceId = deviceId;

  void _onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    final token = _session?.accessToken;
    if (token != null && options.headers['Authorization'] == null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    if (_deviceId != null) {
      options.headers['X-Device-Id'] = _deviceId;
    }
    handler.next(options);
  }

  Future<void> _onError(
    DioException error,
    ErrorInterceptorHandler handler,
  ) async {
    final response = error.response;
    final path = error.requestOptions.path;
    final isAuthCall = path.contains('/auth/') ||
        path.contains('/mobile/activation/');

    // Un 401 sobre un endpoint autenticado dispara un intento de refresh.
    if (response?.statusCode == 401 &&
        !isAuthCall &&
        _session?.refreshToken != null &&
        error.requestOptions.extra['retried'] != true) {
      final refreshed = await _refreshSession();
      if (refreshed) {
        try {
          final retry = await _retry(error.requestOptions);
          handler.resolve(retry);
          return;
        } on DioException catch (e) {
          handler.next(e);
          return;
        }
      } else {
        onSessionExpired?.call();
      }
    }
    handler.next(error);
  }

  /// Renueva la sesión usando el refresh token. Single-flight: varias
  /// peticiones que reciben 401 a la vez comparten un único refresh.
  Future<bool> _refreshSession() {
    return _refreshInFlight ??= _doRefresh().whenComplete(() {
      _refreshInFlight = null;
    });
  }

  Future<bool> _doRefresh() async {
    final current = _session;
    if (current == null) return false;
    try {
      final res = await Dio(BaseOptions(baseUrl: '$_backendBaseUrl/api')).post<
          Map<String, dynamic>>(
        '/auth/refresh',
        data: {'refreshToken': current.refreshToken},
      );
      final data = res.data;
      if (data == null) return false;
      final updated = current.copyWith(
        accessToken: data['accessToken'] as String,
        refreshToken: data['refreshToken'] as String,
      );
      _session = updated;
      onTokensRefreshed?.call(updated);
      return true;
    } on DioException {
      return false;
    }
  }

  Future<Response<dynamic>> _retry(RequestOptions options) {
    options.extra['retried'] = true;
    options.headers.remove('Authorization');
    return _dio.fetch<dynamic>(options);
  }

  /// GET que devuelve el cuerpo JSON ya decodificado.
  Future<dynamic> get(String path, {Map<String, dynamic>? query}) async {
    try {
      final res = await _dio.get<dynamic>(path, queryParameters: query);
      // Nest serializa los handlers que retornan null como body vacío
      // (Content-Length: 0). Lo normalizamos a null para que los repositorios
      // que esperan `T | null` no rompan al castear.
      final data = res.data;
      if (data is String && data.isEmpty) return null;
      return data;
    } on DioException catch (e) {
      throw _mapped(e);
    }
  }

  /// POST que devuelve el cuerpo JSON ya decodificado.
  Future<dynamic> post(String path, {Object? body}) async {
    try {
      final res = await _dio.post<dynamic>(path, data: body);
      return res.data;
    } on DioException catch (e) {
      throw _mapped(e);
    }
  }

  ApiException _mapped(DioException e) {
    final mapped = ApiException.fromDio(e);
    // El 401 ya lo gestionó el interceptor (refresh / expiración). Acá solo
    // se fuerza la salida cuando coordinación revocó el dispositivo.
    if (mapped.isDeviceNotApproved) {
      onSessionExpired?.call();
    }
    return mapped;
  }
}
