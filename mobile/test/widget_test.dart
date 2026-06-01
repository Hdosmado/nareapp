// Pruebas unitarias de la lógica de dominio de NareApp (sin red ni UI).

import 'package:flutter_test/flutter_test.dart';
import 'package:nareapp_mobile/core/constants/service_status.dart';
import 'package:nareapp_mobile/core/utils/geo.dart';
import 'package:nareapp_mobile/data/models/assignment.dart';
import 'package:nareapp_mobile/data/models/mobile_config.dart';
import 'package:nareapp_mobile/data/models/offline_event.dart';
import 'package:nareapp_mobile/state/tracking_controller.dart';

void main() {
  group('ServiceStatus', () {
    test('mapea los valores del backend', () {
      expect(
        ServiceStatus.fromBackend('en_servicio'),
        ServiceStatus.enServicio,
      );
      expect(ServiceStatus.fromBackend('ausente'), ServiceStatus.ausente);
    });

    test('un valor desconocido cae en pendiente', () {
      expect(ServiceStatus.fromBackend('???'), ServiceStatus.pendiente);
      expect(ServiceStatus.fromBackend(null), ServiceStatus.pendiente);
    });

    test('los estados cerrados no están abiertos', () {
      expect(ServiceStatus.finalizado.isOpen, isFalse);
      expect(ServiceStatus.ausente.isOpen, isFalse);
      expect(ServiceStatus.pendiente.isOpen, isTrue);
    });

    test('llegué y en servicio cuentan como arribado', () {
      expect(ServiceStatus.llego.isArrived, isTrue);
      expect(ServiceStatus.enServicio.isArrived, isTrue);
      expect(ServiceStatus.proximo.isArrived, isFalse);
    });
  });

  group('Geo.distanceMeters', () {
    test('la distancia de un punto a sí mismo es cero', () {
      expect(Geo.distanceMeters(-32.95, -60.64, -32.95, -60.64), 0);
    });

    test('mide una distancia conocida con tolerancia', () {
      // Aproximadamente 1.11 km por 0.01 grados de latitud.
      final d = Geo.distanceMeters(-32.95, -60.64, -32.96, -60.64);
      expect(d, greaterThan(1000));
      expect(d, lessThan(1200));
    });
  });

  group('OfflineEvent', () {
    test('serializa y deserializa sin perder datos', () {
      final event = OfflineEvent(
        idempotencyKey: 'key-1',
        type: OfflineEventType.checkIn,
        assignmentId: 'assign-1',
        timestampLocal: DateTime.utc(2026, 5, 22, 10, 47),
        latitude: -32.95,
        longitude: -60.64,
        accuracy: 8,
        exceptionReason: 'fuera de radio',
      );
      final restored = OfflineEvent.fromJson(event.toJson());
      expect(restored.idempotencyKey, 'key-1');
      expect(restored.type, OfflineEventType.checkIn);
      expect(restored.latitude, -32.95);
      expect(restored.exceptionReason, 'fuera de radio');
    });

    test('el cuerpo de sync incluye la clave de idempotencia', () {
      final event = OfflineEvent(
        idempotencyKey: 'key-2',
        type: OfflineEventType.checkOut,
        assignmentId: 'assign-2',
        timestampLocal: DateTime.utc(2026, 5, 22, 14),
      );
      final json = event.toSyncJson();
      expect(json['idempotencyKey'], 'key-2');
      expect(json['type'], 'check_out');
      expect(json['assignmentId'], 'assign-2');
    });

    test('el latido lleva el permiso de ubicación en ambos cuerpos', () {
      final event = OfflineEvent(
        idempotencyKey: 'key-3',
        type: OfflineEventType.preServiceLocation,
        assignmentId: 'assign-3',
        timestampLocal: DateTime.utc(2026, 5, 22, 12),
        latitude: -32.95,
        longitude: -60.64,
        locationPermission: 'siempre',
      );
      expect(event.toDirectJson()['locationPermission'], 'siempre');
      expect(event.toSyncJson()['locationPermission'], 'siempre');
      expect(
        OfflineEvent.fromJson(event.toJson()).locationPermission,
        'siempre',
      );
    });
  });

  group('MobileConfig', () {
    test('usa los valores por defecto ante claves faltantes', () {
      final config = MobileConfig.fromJson(const {});
      expect(config.trackingLeadMin, 10);
      expect(config.trackingTrailMin, 10);
      expect(config.geofenceRadiusM, 150);
    });

    test('lee los valores presentes', () {
      final config = MobileConfig.fromJson(const {
        'trackingLeadMin': 30,
        'trackingTrailMin': 15,
        'trackingIntervalSec': 300,
        'trackingMaxWindowMin': 60,
        'geofenceRadiusM': 200,
      });
      expect(config.trackingLeadMin, 30);
      expect(config.trackingTrailMin, 15);
      expect(config.geofenceRadiusM, 200);
    });
  });

  group('TrackingWindow / pickTrackingAssignment', () {
    const config = MobileConfig(
      trackingLeadMin: 10,
      trackingTrailMin: 10,
      trackingIntervalSec: 600,
      trackingMaxWindowMin: 90,
      geofenceRadiusM: 150,
      earlyCheckoutThresholdPct: 0.25,
    );
    final now = DateTime.utc(2026, 5, 29, 13);

    Assignment mk({
      required String id,
      required Duration startsIn,
      Duration duration = const Duration(hours: 1),
      ServiceStatus status = ServiceStatus.proximo,
    }) {
      final start = now.add(startsIn);
      return Assignment(
        id: id,
        startTime: start,
        endTime: start.add(duration),
        status: status,
        riskLevel: 'verde',
        replacementRequired: false,
        carePerson: const CarePerson(id: 'p', nombre: 'Ana', apellido: 'Gómez'),
        address: const ServiceAddress(
          id: 'a',
          calle: 'Calle 1',
          ciudad: 'Rosario',
          provincia: 'Santa Fe',
          allowedRadiusM: 150,
        ),
      );
    }

    test('arranca lead_min antes del inicio, no antes', () {
      final soon = mk(id: 's', startsIn: const Duration(minutes: 5));
      final tooEarly = mk(id: 'e', startsIn: const Duration(minutes: 20));
      expect(TrackingWindow.contains(soon, config, now), isTrue);
      expect(TrackingWindow.contains(tooEarly, config, now), isFalse);
    });

    test('sigue activo hasta trail_min después del fin', () {
      // Terminó hace 5 min: con trail 10, sigue en ventana.
      final justEnded = mk(
        id: 't',
        startsIn: const Duration(hours: -1, minutes: -5),
      );
      // Terminó hace 15 min: pasó el trail, fuera de ventana.
      final wellEnded = mk(
        id: 'w',
        startsIn: const Duration(hours: -1, minutes: -15),
      );
      expect(TrackingWindow.contains(justEnded, config, now), isTrue);
      expect(TrackingWindow.contains(wellEnded, config, now), isFalse);
    });

    test('elige el servicio en ventana e ignora los cancelados', () {
      final cancelado = mk(
        id: 'x',
        startsIn: const Duration(minutes: 5),
        status: ServiceStatus.cancelado,
      );
      final activo = mk(id: 'y', startsIn: const Duration(minutes: 5));
      final picked = pickTrackingAssignment([cancelado, activo], config, now);
      expect(picked?.id, 'y');
    });

    test('prioriza el servicio en curso sobre uno próximo', () {
      final enServicio = mk(
        id: 'in',
        startsIn: const Duration(minutes: -5),
        status: ServiceStatus.enServicio,
      );
      final proximo = mk(id: 'next', startsIn: const Duration(minutes: 8));
      final picked = pickTrackingAssignment([proximo, enServicio], config, now);
      expect(picked?.id, 'in');
    });

    test('sin servicios en ventana devuelve null', () {
      final lejano = mk(id: 'far', startsIn: const Duration(hours: 3));
      expect(pickTrackingAssignment([lejano], config, now), isNull);
    });
  });
}
