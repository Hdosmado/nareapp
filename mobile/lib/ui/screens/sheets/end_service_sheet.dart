import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../../../core/constants/service_status.dart';
import '../../../core/theme/colors.dart';
import '../../../core/theme/spacing.dart';
import '../../../core/theme/typography.dart';
import '../../../core/utils/formatting.dart';
import '../../../data/api/api_exception.dart';
import '../../../data/models/assignment.dart';
import '../../../data/models/offline_event.dart';
import '../../../state/assignments_controller.dart';
import '../../../state/providers.dart';
import '../../../state/sync_controller.dart';
import '../../widgets/banner.dart';
import '../../widgets/buttons.dart';

/// Paso del flujo de fin de servicio.
enum _Step { confirm, submitting, done, error }

/// Bottom sheet de fin de servicio (FIN DE SERVICIO). Registra el cierre del
/// servicio; la ubicación es opcional, así que no traba el cierre si no hay GPS.
class EndServiceSheet extends ConsumerStatefulWidget {
  const EndServiceSheet({super.key, required this.assignment});

  final Assignment assignment;

  @override
  ConsumerState<EndServiceSheet> createState() => _EndServiceSheetState();
}

class _EndServiceSheetState extends ConsumerState<EndServiceSheet> {
  _Step _step = _Step.confirm;
  String? _errorMessage;
  bool _queuedOffline = false;

  Future<void> _confirm() async {
    setState(() => _step = _Step.submitting);

    // La ubicación al cerrar es opcional: no debe trabar el fin de servicio.
    double? latitude;
    double? longitude;
    double? accuracy;
    final position =
        await ref.read(locationServiceProvider).currentPosition();
    if (position != null) {
      latitude = position.latitude;
      longitude = position.longitude;
      accuracy = position.accuracy;
    }

    final event = OfflineEvent(
      idempotencyKey: const Uuid().v4(),
      type: OfflineEventType.checkOut,
      assignmentId: widget.assignment.id,
      timestampLocal: DateTime.now(),
      latitude: latitude,
      longitude: longitude,
      accuracy: accuracy,
    );

    try {
      final outcome =
          await ref.read(syncControllerProvider.notifier).recordEvent(event);
      ref.read(assignmentsControllerProvider.notifier).applyLocalStatus(
            widget.assignment.id,
            ServiceStatus.finalizado,
          );
      if (!mounted) return;
      setState(() {
        _queuedOffline = outcome == RecordOutcome.queued;
        _step = _Step.done;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _errorMessage = e.message;
        _step = _Step.error;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    switch (_step) {
      case _Step.confirm:
        return _buildConfirm();
      case _Step.submitting:
        return _buildSubmitting();
      case _Step.done:
        return _buildDone();
      case _Step.error:
        return _buildError();
    }
  }

  Widget _buildConfirm() {
    final assignment = widget.assignment;
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Align(
          alignment: Alignment.centerLeft,
          child: Text('Terminar el servicio', style: AppText.h2),
        ),
        const SizedBox(height: Insets.x4),
        Text(assignment.carePerson.nombreCompleto, style: AppText.h3),
        const SizedBox(height: 2),
        Text(
          'Inicio registrado a las '
          '${assignment.checkInAt != null ? Fmt.time(assignment.checkInAt!) : '—'}',
          style: AppText.meta,
        ),
        const SizedBox(height: Insets.x4),
        Text(
          'Confirmá el fin del servicio. Esta acción cierra la prestación '
          'y avisa a coordinación.',
          style: AppText.body.copyWith(color: AppColors.textMuted),
        ),
        const SizedBox(height: Insets.x5),
        PrimaryButton(label: 'Fin de servicio', onPressed: _confirm),
        const SizedBox(height: Insets.x2),
        GhostButton(
          label: 'Cancelar',
          onPressed: () => Navigator.of(context).pop(),
        ),
      ],
    );
  }

  Widget _buildSubmitting() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Align(
          alignment: Alignment.centerLeft,
          child: Text('Terminar el servicio', style: AppText.h2),
        ),
        const SizedBox(height: Insets.x6),
        const CircularProgressIndicator(
          strokeWidth: 2.6,
          valueColor: AlwaysStoppedAnimation(AppColors.primary),
        ),
        const SizedBox(height: Insets.x5),
        Text(
          'Registrando el fin del servicio...',
          style: AppText.body.copyWith(color: AppColors.textMuted),
        ),
        const SizedBox(height: Insets.x6),
      ],
    );
  }

  Widget _buildDone() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            const Icon(Icons.task_alt, color: AppColors.success, size: 28),
            const SizedBox(width: Insets.x3),
            Expanded(
              child: Text(
                'Servicio finalizado — ${Fmt.time(DateTime.now())}',
                style: AppText.h2,
              ),
            ),
          ],
        ),
        const SizedBox(height: Insets.x4),
        Text(
          _queuedOffline
              ? 'Sin conexión. Guardamos el cierre y lo enviamos cuando '
                  'vuelva la señal.'
              : 'Coordinación ya registró el fin del servicio.',
          style: AppText.body.copyWith(color: AppColors.textMuted),
        ),
        const SizedBox(height: Insets.x5),
        PrimaryButton(
          label: 'Listo',
          onPressed: () => Navigator.of(context).pop(),
        ),
      ],
    );
  }

  Widget _buildError() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Align(
          alignment: Alignment.centerLeft,
          child: Text('No se pudo cerrar el servicio', style: AppText.h2),
        ),
        const SizedBox(height: Insets.x4),
        NareBanner(
          tone: BannerTone.danger,
          title: 'Error al registrar el cierre',
          body: _errorMessage,
        ),
        const SizedBox(height: Insets.x5),
        PrimaryButton(
          label: 'Reintentar',
          onPressed: () => setState(() => _step = _Step.confirm),
        ),
        const SizedBox(height: Insets.x2),
        GhostButton(
          label: 'Cancelar',
          onPressed: () => Navigator.of(context).pop(),
        ),
      ],
    );
  }
}
