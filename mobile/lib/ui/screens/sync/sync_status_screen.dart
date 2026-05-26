import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/colors.dart';
import '../../../core/theme/spacing.dart';
import '../../../core/theme/typography.dart';
import '../../../core/utils/formatting.dart';
import '../../../data/models/offline_event.dart';
import '../../../state/providers.dart';
import '../../../state/sync_controller.dart';
import '../../widgets/banner.dart';
import '../../widgets/buttons.dart';
import '../../widgets/status_views.dart';
import '../../widgets/top_bar.dart';

/// Estado de la sincronización offline: conexión, cola de eventos pendientes
/// y sincronización manual.
class SyncStatusScreen extends ConsumerStatefulWidget {
  const SyncStatusScreen({super.key});

  @override
  ConsumerState<SyncStatusScreen> createState() => _SyncStatusScreenState();
}

class _SyncStatusScreenState extends ConsumerState<SyncStatusScreen> {
  List<OfflineEvent> _pending = const [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _reload();
  }

  Future<void> _reload() async {
    final events = await ref.read(offlineStoreProvider).readAll();
    if (!mounted) return;
    setState(() {
      _pending = events;
      _loading = false;
    });
  }

  Future<void> _syncNow() async {
    await ref.read(syncControllerProvider.notifier).flush();
    await _reload();
  }

  @override
  Widget build(BuildContext context) {
    final sync = ref.watch(syncControllerProvider);

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: NareTopBar(
        title: 'Sincronización',
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          color: AppColors.ink800,
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: ListView(
                padding: const EdgeInsets.all(Insets.screenPadX),
                children: [
                  NareBanner(
                    tone: sync.isOnline
                        ? BannerTone.success
                        : BannerTone.warning,
                    icon: sync.isOnline
                        ? Icons.cloud_done_outlined
                        : Icons.cloud_off_outlined,
                    title:
                        sync.isOnline ? 'Con conexión' : 'Sin conexión',
                    body: sync.isOnline
                        ? 'Los registros se envían apenas se generan.'
                        : 'Guardamos todo en el teléfono. Se envía solo '
                            'cuando vuelva la señal.',
                  ),
                  if (sync.lastError != null) ...[
                    const SizedBox(height: Insets.x3),
                    NareBanner(
                      tone: BannerTone.danger,
                      title: 'Hubo un problema al sincronizar',
                      body: sync.lastError,
                    ),
                  ],
                  const SizedBox(height: Insets.x5),
                  Text(
                    'Registros pendientes',
                    style: AppText.label,
                  ),
                  const SizedBox(height: Insets.x2),
                  if (_loading)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: Insets.x7),
                      child: NareLoading(),
                    )
                  else if (_pending.isEmpty)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: Insets.x6),
                      child: NareEmptyView(
                        icon: Icons.cloud_done_outlined,
                        title: 'Todo sincronizado',
                        body: 'No hay registros esperando ser enviados.',
                      ),
                    )
                  else
                    for (final event in _pending) ...[
                      _EventRow(event: event),
                      const SizedBox(height: Insets.x2),
                    ],
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(
                Insets.screenPadX,
                Insets.x2,
                Insets.screenPadX,
                Insets.x4,
              ),
              child: PrimaryButton(
                label: 'Sincronizar ahora',
                icon: Icons.cloud_sync_outlined,
                loading: sync.isSyncing,
                onPressed: sync.isOnline && _pending.isNotEmpty
                    ? _syncNow
                    : null,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _EventRow extends StatelessWidget {
  const _EventRow({required this.event});
  final OfflineEvent event;

  String get _label {
    switch (event.type) {
      case OfflineEventType.checkIn:
        return 'Confirmación de llegada';
      case OfflineEventType.checkOut:
        return 'Fin de servicio';
      case OfflineEventType.preServiceLocation:
        return 'Ubicación previa al servicio';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(Insets.x4),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(Radii.md),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          const Icon(
            Icons.cloud_upload_outlined,
            size: 22,
            color: AppColors.info,
          ),
          const SizedBox(width: Insets.x3),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(_label, style: AppText.bodyStrong),
                const SizedBox(height: 2),
                Text(
                  '${Fmt.shortDate(event.timestampLocal)} '
                  '${Fmt.time(event.timestampLocal)}',
                  style: AppText.meta,
                ),
              ],
            ),
          ),
          Text('pendiente', style: AppText.label.copyWith(letterSpacing: 0)),
        ],
      ),
    );
  }
}
