import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/api/api_exception.dart';
import '../data/models/offline_event.dart';
import 'providers.dart';

/// Desenlace de registrar un evento operativo.
enum RecordOutcome {
  /// El evento llegó al backend en el momento.
  synced,

  /// No había conexión: el evento quedó guardado y se enviará al volver la red.
  queued,
}

/// Estado de la sincronización offline-first.
class SyncState {
  const SyncState({
    this.isOnline = true,
    this.isSyncing = false,
    this.pendingCount = 0,
    this.lastSyncAt,
    this.lastError,
  });

  /// Hay conexión de red.
  final bool isOnline;

  /// Hay una sincronización en curso.
  final bool isSyncing;

  /// Eventos en la cola local esperando confirmación del backend.
  final int pendingCount;

  /// Momento de la última sincronización exitosa.
  final DateTime? lastSyncAt;

  /// Último error de sincronización, si lo hubo.
  final String? lastError;

  bool get hasPending => pendingCount > 0;

  SyncState copyWith({
    bool? isOnline,
    bool? isSyncing,
    int? pendingCount,
    DateTime? lastSyncAt,
    String? lastError,
    bool clearError = false,
  }) {
    return SyncState(
      isOnline: isOnline ?? this.isOnline,
      isSyncing: isSyncing ?? this.isSyncing,
      pendingCount: pendingCount ?? this.pendingCount,
      lastSyncAt: lastSyncAt ?? this.lastSyncAt,
      lastError: clearError ? null : (lastError ?? this.lastError),
    );
  }
}

/// Orquesta el modelo offline-first: persiste cada evento operativo apenas se
/// genera, intenta entregarlo de inmediato si hay red y vacía la cola contra
/// `/sync/events` cuando la conexión vuelve. Ningún evento se pierde.
class SyncController extends Notifier<SyncState> {
  @override
  SyncState build() {
    // Sincroniza automáticamente al recuperar la conexión.
    ref.listen<AsyncValue<bool>>(connectivityStreamProvider, (prev, next) {
      final online = next.value ?? true;
      state = state.copyWith(isOnline: online);
      if (online) {
        flush();
      }
    });
    // Al abrir la app (lifecycle `resumed`) se envía de una sola vez el lote
    // de latidos que se fueron acumulando mientras estuvo en segundo plano.
    final observer = _ResumeFlusher(flush);
    WidgetsBinding.instance.addObserver(observer);
    ref.onDispose(() => WidgetsBinding.instance.removeObserver(observer));
    Future.microtask(_init);
    return const SyncState();
  }

  Future<void> _init() async {
    final pending = await ref.read(offlineStoreProvider).readAll();
    final online = await ref.read(connectivityServiceProvider).isOnline();
    state = state.copyWith(pendingCount: pending.length, isOnline: online);
    if (online && pending.isNotEmpty) {
      flush();
    }
  }

  /// Registra un evento operativo. Siempre lo persiste primero (offline-first)
  /// y, si hay red, intenta entregarlo de inmediato por su endpoint directo.
  Future<RecordOutcome> recordEvent(OfflineEvent event) async {
    final store = ref.read(offlineStoreProvider);
    await store.add(event);
    state = state.copyWith(pendingCount: state.pendingCount + 1);

    if (!state.isOnline) {
      return RecordOutcome.queued;
    }

    try {
      await _deliverDirect(event);
      await store.removeKeys({event.idempotencyKey});
      state = state.copyWith(
        pendingCount: (state.pendingCount - 1).clamp(0, 1 << 30),
        lastSyncAt: DateTime.now(),
        clearError: true,
      );
      return RecordOutcome.synced;
    } on ApiException catch (e) {
      if (e.isNetworkError) {
        // Sin conexión real: el evento queda en la cola para reintentarse.
        state = state.copyWith(isOnline: false);
        return RecordOutcome.queued;
      }
      // Error definitivo del servidor: se quita de la cola y se propaga.
      await store.removeKeys({event.idempotencyKey});
      state = state.copyWith(
        pendingCount: (state.pendingCount - 1).clamp(0, 1 << 30),
      );
      rethrow;
    }
  }

  /// Acumula un evento en la cola **sin** intentar entregarlo en el momento.
  ///
  /// Pensado para los latidos de la ventana de tracking: en vez de pegarle al
  /// backend por cada punto, se van juntando y se mandan en un solo lote
  /// (`/sync/events`) cuando la app vuelve a primer plano o al recuperar red.
  /// Reduce despertares de red y batería; el endpoint es idempotente, así que
  /// reenviar lo ya aceptado no duplica nada.
  Future<void> enqueueDeferred(OfflineEvent event) async {
    await ref.read(offlineStoreProvider).add(event);
    state = state.copyWith(pendingCount: state.pendingCount + 1);
  }

  Future<void> _deliverDirect(OfflineEvent event) {
    final repo = ref.read(attendanceRepositoryProvider);
    switch (event.type) {
      case OfflineEventType.checkIn:
        return repo.checkIn(event);
      case OfflineEventType.checkOut:
        return repo.checkOut(event);
      case OfflineEventType.preServiceLocation:
        return repo.recordPreServiceLocation(event);
    }
  }

  /// Vacía la cola contra `/sync/events`. Idempotente y seguro de llamar
  /// varias veces: si ya hay una sincronización en curso, no hace nada.
  Future<void> flush() async {
    if (state.isSyncing || !state.isOnline) return;
    final store = ref.read(offlineStoreProvider);
    final pending = await store.readAll();
    if (pending.isEmpty) {
      state = state.copyWith(pendingCount: 0);
      return;
    }

    state = state.copyWith(isSyncing: true, clearError: true);
    try {
      final results =
          await ref.read(syncRepositoryProvider).pushBatch(pending);
      final acceptedKeys =
          results.where((r) => r.ok).map((r) => r.idempotencyKey).toSet();
      await store.removeKeys(acceptedKeys);
      final remaining = await store.readAll();
      final failed = results.where((r) => !r.ok).toList();
      state = state.copyWith(
        isSyncing: false,
        pendingCount: remaining.length,
        lastSyncAt: DateTime.now(),
        lastError: failed.isEmpty
            ? null
            : 'Algunos eventos no se pudieron registrar.',
        clearError: failed.isEmpty,
      );
    } on ApiException catch (e) {
      state = state.copyWith(
        isSyncing: false,
        isOnline: !e.isNetworkError && state.isOnline,
        lastError: e.message,
      );
    }
  }
}

/// Observa el ciclo de vida de la app y dispara el envío del lote acumulado
/// cuando el prestador la abre (`AppLifecycleState.resumed`). Se mantiene
/// liviano: la decisión de si hay algo para enviar y si hay red la toma
/// `flush()`, que es idempotente y seguro de llamar de más.
class _ResumeFlusher extends WidgetsBindingObserver {
  _ResumeFlusher(this._onResume);

  final Future<void> Function() _onResume;

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _onResume();
    }
  }
}

/// Proveedor global de la sincronización offline.
final syncControllerProvider =
    NotifierProvider<SyncController, SyncState>(SyncController.new);
