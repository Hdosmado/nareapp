import 'package:flutter/material.dart';

import '../theme/colors.dart';

/// Estado operativo de un servicio asignado, tal como lo expone el backend
/// (`AssignmentStatus`), más el estado sintético `pendienteSync` que solo
/// existe en el cliente mientras un evento espera sincronizarse.
enum ServiceStatus {
  pendiente('pendiente', 'pendiente'),
  proximo('proximo', 'próximo'),
  enRiesgo('en_riesgo', 'en riesgo'),
  enCamino('en_camino', 'en camino'),
  demorado('demorado', 'demorado'),
  llego('llego', 'llegué'),
  enServicio('en_servicio', 'en servicio'),
  finalizado('finalizado', 'finalizado'),
  ausenteProbable('ausente_probable', 'ausencia probable'),
  ausente('ausente', 'ausente'),
  cancelado('cancelado', 'cancelado'),
  pendienteSync('__sync__', 'pendiente de sincronización');

  const ServiceStatus(this.backendValue, this.label);

  /// Valor con el que el backend nombra el estado.
  final String backendValue;

  /// Etiqueta en minúscula que se muestra en la interfaz.
  final String label;

  /// Resuelve un estado a partir del string del backend. Desconocido cae en
  /// `pendiente` para no romper la interfaz.
  static ServiceStatus fromBackend(String? value) {
    return ServiceStatus.values.firstWhere(
      (s) => s.backendValue == value,
      orElse: () => ServiceStatus.pendiente,
    );
  }

  /// Colores del estado (fondo, texto y punto) para la `StatusPill`.
  StateColors get colors {
    switch (this) {
      case ServiceStatus.pendiente:
        return StateTokens.pendiente;
      case ServiceStatus.proximo:
      case ServiceStatus.enCamino:
        return StateTokens.proximo;
      case ServiceStatus.enRiesgo:
      case ServiceStatus.ausenteProbable:
        return StateTokens.enRiesgo;
      case ServiceStatus.demorado:
        return StateTokens.demorado;
      case ServiceStatus.llego:
        return StateTokens.llegue;
      case ServiceStatus.enServicio:
        return StateTokens.enServicio;
      case ServiceStatus.finalizado:
      case ServiceStatus.cancelado:
        return StateTokens.finalizado;
      case ServiceStatus.ausente:
        return StateTokens.ausente;
      case ServiceStatus.pendienteSync:
        return StateTokens.sync;
    }
  }

  /// Ícono asociado al estado (set line-style, coherente con el design system).
  IconData get icon {
    switch (this) {
      case ServiceStatus.pendiente:
      case ServiceStatus.proximo:
      case ServiceStatus.enCamino:
        return Icons.schedule_outlined;
      case ServiceStatus.enRiesgo:
      case ServiceStatus.demorado:
      case ServiceStatus.ausenteProbable:
        return Icons.warning_amber_outlined;
      case ServiceStatus.llego:
        return Icons.where_to_vote_outlined;
      case ServiceStatus.enServicio:
        return Icons.radio_button_checked;
      case ServiceStatus.finalizado:
        return Icons.check_circle_outline;
      case ServiceStatus.ausente:
      case ServiceStatus.cancelado:
        return Icons.cancel_outlined;
      case ServiceStatus.pendienteSync:
        return Icons.cloud_upload_outlined;
    }
  }

  /// El servicio sigue operativo (todavía no se cerró ni se canceló).
  bool get isOpen =>
      this != ServiceStatus.finalizado &&
      this != ServiceStatus.cancelado &&
      this != ServiceStatus.ausente;

  /// La llegada ya fue confirmada para este servicio.
  bool get isArrived =>
      this == ServiceStatus.llego || this == ServiceStatus.enServicio;
}
