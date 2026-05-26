// Tests del [PushService] (stub y contrato del impl real).

import 'package:flutter_test/flutter_test.dart';
import 'package:nareapp_mobile/services/push_service.dart';

void main() {
  group('StubPushService', () {
    test('devuelve un token determinístico derivado del deviceId', () async {
      final stub = StubPushService('device-abc');
      expect(await stub.obtainToken(), 'stub-push-token:device-abc');
    });

    test('tokens iguales para el mismo deviceId', () async {
      final a = StubPushService('d-1');
      final b = StubPushService('d-1');
      expect(await a.obtainToken(), await b.obtainToken());
    });

    test('tokens distintos para deviceIds distintos', () async {
      final a = await StubPushService('d-1').obtainToken();
      final b = await StubPushService('d-2').obtainToken();
      expect(a, isNot(b));
    });

    test('init() no rompe ni hace efecto observable', () async {
      final stub = StubPushService('d-1');
      await stub.init();
      expect(await stub.obtainToken(), startsWith('stub-push-token:'));
    });

    test('tokenRefreshes es un stream vacío', () async {
      final stub = StubPushService('d-1');
      expect(await stub.tokenRefreshes.toList(), isEmpty);
    });
  });

  // Smoke test del contrato del PushService: cualquier impl debe cumplir
  // que `obtainToken()` devuelva un Future<String?> y `tokenRefreshes` sea
  // un Stream<String>. Esto protege contra romper la interfaz al evolucionar.
  test('PushService respeta el contrato esperado', () async {
    final PushService service = StubPushService('any');
    final Future<String?> token = service.obtainToken();
    final Stream<String> refreshes = service.tokenRefreshes;
    expect(await token, isA<String>());
    expect(refreshes, isA<Stream<String>>());
  });
}
