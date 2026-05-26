import 'package:dio/dio.dart';

/// Error de API normalizado, con un mensaje accionable en castellano listo
/// para mostrarse al prestador. Distingue los cortes de red (el evento se
/// guarda y se reintenta) de los errores del servidor.
class ApiException implements Exception {
  ApiException(
    this.message, {
    this.statusCode,
    this.code,
    this.isNetworkError = false,
  });

  /// Mensaje legible para el prestador.
  final String message;

  /// Código HTTP, cuando hubo respuesta del servidor.
  final int? statusCode;

  /// Código de error de dominio del backend (p. ej. `DEVICE_NOT_APPROVED`).
  final String? code;

  /// El error es un corte de conexión, no una respuesta del servidor.
  final bool isNetworkError;

  /// El dispositivo fue revocado o todavía no está aprobado por coordinación.
  bool get isDeviceNotApproved => code == 'DEVICE_NOT_APPROVED';

  /// La sesión expiró y no se pudo renovar.
  bool get isUnauthorized => statusCode == 401;

  @override
  String toString() => message;

  /// Traduce un [DioException] a un [ApiException] con mensaje claro.
  factory ApiException.fromDio(DioException error) {
    switch (error.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
      case DioExceptionType.connectionError:
        return ApiException(
          'Sin conexión con el servidor. Revisá tu red e intentá de nuevo.',
          isNetworkError: true,
        );
      case DioExceptionType.badCertificate:
        return ApiException('No se pudo verificar la conexión segura.');
      case DioExceptionType.cancel:
        return ApiException('La operación se canceló.');
      case DioExceptionType.unknown:
        return ApiException(
          'Sin conexión con el servidor. Revisá tu red e intentá de nuevo.',
          isNetworkError: true,
        );
      case DioExceptionType.badResponse:
        return ApiException.fromResponse(error.response);
    }
  }

  /// Extrae el mensaje del cuerpo de error uniforme del backend
  /// (`{ statusCode, code?, message }`).
  factory ApiException.fromResponse(Response<dynamic>? response) {
    final status = response?.statusCode;
    final data = response?.data;
    String? message;
    String? code;
    if (data is Map) {
      code = data['code'] as String?;
      final raw = data['message'];
      if (raw is String) {
        message = raw;
      } else if (raw is List && raw.isNotEmpty) {
        message = raw.first.toString();
      } else if (raw is Map && raw['message'] is String) {
        message = raw['message'] as String;
      }
    }
    return ApiException(
      message ?? _defaultForStatus(status),
      statusCode: status,
      code: code,
    );
  }

  static String _defaultForStatus(int? status) {
    if (status == null) return 'Ocurrió un error inesperado.';
    if (status == 401) return 'Tu sesión venció. Volvé a ingresar.';
    if (status == 403) return 'No tenés permiso para esta acción.';
    if (status == 404) return 'No se encontró el recurso solicitado.';
    if (status >= 500) {
      return 'El servidor tuvo un problema. Intentá de nuevo en un momento.';
    }
    return 'No se pudo completar la operación.';
  }
}
