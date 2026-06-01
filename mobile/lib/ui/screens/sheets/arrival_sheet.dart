import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../../../core/constants/service_status.dart';
import '../../../core/theme/colors.dart';
import '../../../core/theme/spacing.dart';
import '../../../core/theme/typography.dart';
import '../../../core/utils/formatting.dart';
import '../../../core/utils/geo.dart';
import '../../../data/api/api_exception.dart';
import '../../../data/models/assignment.dart';
import '../../../data/models/offline_event.dart';
import '../../../services/location_service.dart';
import '../../../state/assignments_controller.dart';
import '../../../state/providers.dart';
import '../../../state/sync_controller.dart';
import '../../widgets/banner.dart';
import '../../widgets/buttons.dart';
import '../../widgets/nare_text_field.dart';

/// Paso del flujo de confirmación de llegada.
enum _Step { locating, locationError, confirmInside, confirmOutside, submitting, done }

/// Bottom sheet de confirmación de llegada (LLEGUÉ). Obtiene la ubicación,
/// valida el radio del domicilio y registra el evento. Si la llegada cae
/// fuera del radio, pide un motivo breve.
class ArrivalSheet extends ConsumerStatefulWidget {
  const ArrivalSheet({super.key, required this.assignment});

  final Assignment assignment;

  @override
  ConsumerState<ArrivalSheet> createState() => _ArrivalSheetState();
}

class _ArrivalSheetState extends ConsumerState<ArrivalSheet> {
  _Step _step = _Step.locating;
  final _reason = TextEditingController();

  double? _latitude;
  double? _longitude;
  double? _accuracy;
  bool? _isMocked;
  double? _distance;
  LocationPermissionResult? _permission;
  String? _errorMessage;
  bool _queuedOffline = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _locate());
  }

  @override
  void dispose() {
    _reason.dispose();
    super.dispose();
  }

  Future<void> _locate() async {
    setState(() => _step = _Step.locating);
    final location = ref.read(locationServiceProvider);

    final permission = await location.ensurePermission();
    if (permission != LocationPermissionResult.granted) {
      setState(() {
        _permission = permission;
        _step = _Step.locationError;
      });
      return;
    }

    final position = await location.currentPosition();
    if (!mounted) return;
    if (position == null) {
      setState(() {
        _permission = LocationPermissionResult.serviceDisabled;
        _step = _Step.locationError;
      });
      return;
    }

    _latitude = position.latitude;
    _longitude = position.longitude;
    _accuracy = position.accuracy;
    // Bandera anti-spoofing: la app solo la reporta; el backend recalcula la
    // geocerca y decide. No usamos isMocked para cambiar el flujo de la UI.
    _isMocked = position.isMocked;

    final address = widget.assignment.address;
    if (address.hasCoordinates) {
      _distance = Geo.distanceMeters(
        position.latitude,
        position.longitude,
        address.latitude!,
        address.longitude!,
      );
      final inside = _distance! <= address.allowedRadiusM;
      setState(() => _step = inside ? _Step.confirmInside : _Step.confirmOutside);
    } else {
      // Sin coordenadas del domicilio no se puede validar el radio.
      setState(() => _step = _Step.confirmInside);
    }
  }

  Future<void> _confirm() async {
    final outside = _step == _Step.confirmOutside;
    if (outside && _reason.text.trim().isEmpty) return;
    setState(() => _step = _Step.submitting);

    final event = OfflineEvent(
      idempotencyKey: const Uuid().v4(),
      type: OfflineEventType.checkIn,
      assignmentId: widget.assignment.id,
      timestampLocal: DateTime.now(),
      latitude: _latitude,
      longitude: _longitude,
      accuracy: _accuracy,
      isMocked: _isMocked,
      exceptionReason: outside ? _reason.text.trim() : null,
    );

    try {
      final outcome =
          await ref.read(syncControllerProvider.notifier).recordEvent(event);
      // El tracking NO se corta al llegar: sigue activo durante todo el
      // servicio (control anti-fraude). Se detiene solo al cerrarse la ventana
      // (fin + trail), de forma automática.
      ref.read(assignmentsControllerProvider.notifier).applyLocalStatus(
            widget.assignment.id,
            ServiceStatus.enServicio,
            markCheckIn: true,
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
        _step = _Step.locationError;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    switch (_step) {
      case _Step.locating:
        return _buildLocating();
      case _Step.locationError:
        return _buildError();
      case _Step.confirmInside:
        return _buildConfirm(outside: false);
      case _Step.confirmOutside:
        return _buildConfirm(outside: true);
      case _Step.submitting:
        return _buildSubmitting();
      case _Step.done:
        return _buildDone();
    }
  }

  Widget _header(String title) => Align(
        alignment: Alignment.centerLeft,
        child: Text(title, style: AppText.h2),
      );

  Widget _buildLocating() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        _header('Confirmar llegada'),
        const SizedBox(height: Insets.x6),
        const CircularProgressIndicator(
          strokeWidth: 2.6,
          valueColor: AlwaysStoppedAnimation(AppColors.primary),
        ),
        const SizedBox(height: Insets.x5),
        Text(
          'Obteniendo tu ubicación...',
          style: AppText.body.copyWith(color: AppColors.textMuted),
        ),
        const SizedBox(height: Insets.x6),
      ],
    );
  }

  Widget _buildError() {
    final permission = _permission;
    final blocked = permission == LocationPermissionResult.deniedForever;
    final message = _errorMessage ?? _permissionMessage(permission);
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _header('No pudimos registrar la llegada'),
        const SizedBox(height: Insets.x4),
        NareBanner(
          tone: BannerTone.warning,
          title: 'Necesitamos tu ubicación',
          body: message,
        ),
        const SizedBox(height: Insets.x5),
        if (blocked)
          PrimaryButton(
            label: 'Abrir ajustes',
            onPressed: () =>
                ref.read(locationServiceProvider).openSettings(),
          )
        else
          PrimaryButton(label: 'Reintentar', onPressed: _locate),
        const SizedBox(height: Insets.x2),
        GhostButton(
          label: 'Cancelar',
          onPressed: () => Navigator.of(context).pop(),
        ),
      ],
    );
  }

  Widget _buildConfirm({required bool outside}) {
    final assignment = widget.assignment;
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _header('Confirmar llegada'),
        const SizedBox(height: Insets.x4),
        Text(
          assignment.carePerson.nombreCompleto,
          style: AppText.h3,
        ),
        const SizedBox(height: 2),
        Text(
          '${assignment.address.calle} · ${assignment.address.localidad}',
          style: AppText.meta,
        ),
        const SizedBox(height: Insets.x4),
        if (outside) ...[
          NareBanner(
            tone: BannerTone.warning,
            title: 'Estás fuera del radio del domicilio',
            body: _distance == null
                ? 'Contanos por qué confirmás la llegada desde acá.'
                : 'Estás a unos ${_distance!.round()} m del domicilio. '
                    'Contanos por qué confirmás la llegada desde acá.',
          ),
          const SizedBox(height: Insets.x4),
          NareTextField(
            label: 'Motivo',
            controller: _reason,
            hint: 'Ej.: el domicilio figura mal ubicado',
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: Insets.x5),
        ] else ...[
          NareBanner(
            tone: BannerTone.success,
            title: 'Estás en el domicilio',
            body: 'Confirmá tu llegada para iniciar el servicio.',
          ),
          const SizedBox(height: Insets.x5),
        ],
        CriticalButton(
          label: 'Confirmar llegada',
          onPressed: outside && _reason.text.trim().isEmpty ? null : _confirm,
        ),
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
        _header('Confirmar llegada'),
        const SizedBox(height: Insets.x6),
        const CircularProgressIndicator(
          strokeWidth: 2.6,
          valueColor: AlwaysStoppedAnimation(AppColors.primary),
        ),
        const SizedBox(height: Insets.x5),
        Text(
          'Registrando tu llegada...',
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
            const Icon(
              Icons.where_to_vote,
              color: AppColors.success,
              size: 28,
            ),
            const SizedBox(width: Insets.x3),
            Expanded(
              child: Text(
                'Llegada registrada — ${Fmt.time(DateTime.now())}',
                style: AppText.h2,
              ),
            ),
          ],
        ),
        const SizedBox(height: Insets.x4),
        Text(
          _queuedOffline
              ? 'Sin conexión. Guardamos tu llegada y la enviamos cuando '
                  'vuelva la señal.'
              : 'El servicio quedó iniciado. Coordinación ya está al tanto.',
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

  String _permissionMessage(LocationPermissionResult? permission) {
    switch (permission) {
      case LocationPermissionResult.deniedForever:
        return 'El permiso de ubicación está bloqueado. Abrí los ajustes '
            'para habilitarlo.';
      case LocationPermissionResult.serviceDisabled:
        return 'El GPS del teléfono está apagado o no respondió. Encendelo '
            'e intentá de nuevo.';
      case LocationPermissionResult.denied:
      case LocationPermissionResult.granted:
      case null:
        return 'Permití el acceso a la ubicación para confirmar la llegada.';
    }
  }
}
