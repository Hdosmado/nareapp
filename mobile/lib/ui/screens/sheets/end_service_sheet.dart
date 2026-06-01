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
import '../../../data/models/mobile_config.dart';
import '../../../data/models/offline_event.dart';
import '../../../state/assignments_controller.dart';
import '../../../state/providers.dart';
import '../../../state/sync_controller.dart';
import '../../widgets/banner.dart';
import '../../widgets/buttons.dart';

/// Paso del flujo de fin de servicio.
enum _Step { confirm, earlyWarning, submitting, done, error }

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
  final TextEditingController _reasonController = TextEditingController();

  @override
  void initState() {
    super.initState();
    // Cierre temprano: vamos directo al aviso, sin pasar antes por la
    // confirmación simple. Así el prestador ve un solo modal en vez de dos.
    if (_isEarlyCheckout) {
      _step = _Step.earlyWarning;
    }
  }

  @override
  void dispose() {
    _reasonController.dispose();
    super.dispose();
  }

  /// Umbral adaptativo: el bottom sheet aparece si al cerrar falta más del
  /// [MobileConfig.earlyCheckoutThresholdPct] del turno total. Si la app
  /// todavía no tiene config del backend, cae en el fallback (0.25 = 25%).
  bool get _isEarlyCheckout {
    final assignment = widget.assignment;
    final remaining = assignment.endTime.difference(DateTime.now());
    if (remaining <= Duration.zero) return false;
    final duration = assignment.endTime.difference(assignment.startTime);
    if (duration <= Duration.zero) return false;
    final pct = ref.read(mobileConfigProvider).value?.earlyCheckoutThresholdPct ??
        MobileConfig.fallback.earlyCheckoutThresholdPct;
    final thresholdMs = (duration.inMilliseconds * pct).round();
    return remaining.inMilliseconds > thresholdMs;
  }

  /// Punto de entrada desde el botón principal del paso de confirmación:
  /// si la finalización es temprana, muestra el warning; si no, manda directo.
  void _onConfirmTapped() {
    if (_isEarlyCheckout) {
      setState(() => _step = _Step.earlyWarning);
    } else {
      _submit();
    }
  }

  Future<void> _submit() async {
    setState(() => _step = _Step.submitting);

    // La ubicación al cerrar es opcional: no debe trabar el fin de servicio.
    double? latitude;
    double? longitude;
    double? accuracy;
    bool? isMocked;
    final position =
        await ref.read(locationServiceProvider).currentPosition();
    if (position != null) {
      latitude = position.latitude;
      longitude = position.longitude;
      accuracy = position.accuracy;
      // Bandera anti-spoofing reportada al backend (no decide nada en la app).
      isMocked = position.isMocked;
    }

    final rawReason = _reasonController.text.trim();
    final earlyReason = _isEarlyCheckout && rawReason.isNotEmpty
        ? rawReason
        : null;

    final event = OfflineEvent(
      idempotencyKey: const Uuid().v4(),
      type: OfflineEventType.checkOut,
      assignmentId: widget.assignment.id,
      timestampLocal: DateTime.now(),
      latitude: latitude,
      longitude: longitude,
      accuracy: accuracy,
      isMocked: isMocked,
      earlyCheckoutReason: earlyReason,
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
      case _Step.earlyWarning:
        return _buildEarlyWarning();
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
        PrimaryButton(label: 'Fin de servicio', onPressed: _onConfirmTapped),
        const SizedBox(height: Insets.x2),
        GhostButton(
          label: 'Cancelar',
          onPressed: () => Navigator.of(context).pop(),
        ),
      ],
    );
  }

  Widget _buildEarlyWarning() {
    final remaining = widget.assignment.endTime.difference(DateTime.now());
    final minutes = remaining.inMinutes;
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Align(
          alignment: Alignment.centerLeft,
          child: Text(
            'Estás finalizando antes del horario previsto',
            style: AppText.h2,
          ),
        ),
        const SizedBox(height: Insets.x4),
        NareBanner(
          tone: BannerTone.warning,
          title: 'Faltan unos $minutes min para el cierre previsto',
          body:
              'El servicio termina a las '
              '${Fmt.time(widget.assignment.endTime)}. '
              'Si querés, contanos por qué estás finalizando antes; queda '
              'visible para coordinación.',
        ),
        const SizedBox(height: Insets.x4),
        Text('Motivo (opcional)', style: AppText.label),
        const SizedBox(height: Insets.x2),
        TextField(
          controller: _reasonController,
          minLines: 2,
          maxLines: 4,
          maxLength: 280,
          textInputAction: TextInputAction.newline,
          decoration: const InputDecoration(
            hintText: 'Ej: paciente se durmió, familiar tomó turno…',
            border: OutlineInputBorder(),
          ),
        ),
        const SizedBox(height: Insets.x4),
        PrimaryButton(label: 'Finalizar igual', onPressed: _submit),
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
