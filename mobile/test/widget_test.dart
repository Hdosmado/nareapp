// Pruebas unitarias de la lógica de dominio de NareApp (sin red ni UI).

import 'package:flutter_test/flutter_test.dart';
import 'package:nareapp_mobile/core/constants/service_status.dart';
import 'package:nareapp_mobile/core/utils/geo.dart';
import 'package:nareapp_mobile/data/models/mobile_config.dart';
import 'package:nareapp_mobile/data/models/offline_event.dart';

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
  });

  group('MobileConfig', () {
    test('usa los valores por defecto ante claves faltantes', () {
      final config = MobileConfig.fromJson(const {});
      expect(config.trackingLeadMin, 45);
      expect(config.geofenceRadiusM, 150);
    });

    test('lee los valores presentes', () {
      final config = MobileConfig.fromJson(const {
        'trackingLeadMin': 30,
        'trackingIntervalSec': 300,
        'trackingMaxWindowMin': 60,
        'geofenceRadiusM': 200,
      });
      expect(config.trackingLeadMin, 30);
      expect(config.geofenceRadiusM, 200);
    });
  });
}
