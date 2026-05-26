import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/colors.dart';
import '../../../core/theme/spacing.dart';
import '../../../core/theme/typography.dart';
import '../../../core/utils/formatting.dart';
import '../../../data/models/assignment.dart';
import '../../../data/models/mobile_config.dart';
import '../../../services/location_service.dart';
import '../../../state/assignments_controller.dart';
import '../../../state/providers.dart';
import '../../../state/sync_controller.dart';
import '../../../state/tracking_controller.dart';
import '../../widgets/banner.dart';
import '../../widgets/buttons.dart';
import '../../widgets/nare_bottom_sheet.dart';
import '../../widgets/section_header.dart';
import '../../widgets/service_card.dart';
import '../../widgets/status_pill.dart';
import '../../widgets/status_views.dart';
import '../../widgets/top_bar.dart';
import '../permissions/permission_intro_screen.dart';
import '../service/map_screen.dart';
import '../sheets/arrival_sheet.dart';
import '../sheets/end_service_sheet.dart';

/// Pantalla principal: el servicio actual del prestador, con la persona a
/// cuidar, el domicilio, el horario y las acciones LLEGUÉ / FIN DE SERVICIO.
class TodayScreen extends ConsumerWidget {
  const TodayScreen({super.key, required this.onSeeAllServices});

  final VoidCallback onSeeAllServices;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final assignments = ref.watch(assignmentsControllerProvider);
    final sync = ref.watch(syncControllerProvider);

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: NareTopBar(
        title: 'Servicio actual',
        action: _SyncDot(online: sync.isOnline, syncing: sync.isSyncing),
      ),
      body: assignments.when(
        loading: () => const NareLoading(),
        error: (_, _) => NareErrorView(
          message:
              'No pudimos cargar tus servicios. Revisá la conexión e intentá '
              'de nuevo.',
          onRetry: () =>
              ref.read(assignmentsControllerProvider.notifier).refresh(),
        ),
        data: (data) => _Content(
          data: data,
          sync: sync,
          onSeeAllServices: onSeeAllServices,
        ),
      ),
    );
  }
}

class _SyncDot extends StatelessWidget {
  const _SyncDot({required this.online, required this.syncing});

  final bool online;
  final bool syncing;

  @override
  Widget build(BuildContext context) {
    if (syncing) {
      return const SizedBox(
        width: 18,
        height: 18,
        child: CircularProgressIndicator(
          strokeWidth: 2.2,
          valueColor: AlwaysStoppedAnimation(AppColors.primary),
        ),
      );
    }
    return Icon(
      online ? Icons.cloud_done_outlined : Icons.cloud_off_outlined,
      size: 22,
      color: online ? AppColors.ink400 : AppColors.warning,
    );
  }
}

class _Content extends ConsumerWidget {
  const _Content({
    required this.data,
    required this.sync,
    required this.onSeeAllServices,
  });

  final AssignmentsState data;
  final SyncState sync;
  final VoidCallback onSeeAllServices;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final current = data.current;
    final others = data.today
        .where((a) => a.id != current?.id && a.status.isOpen)
        .toList();

    return Column(
      children: [
        Expanded(
          child: RefreshIndicator(
            color: AppColors.primary,
            onRefresh: () =>
                ref.read(assignmentsControllerProvider.notifier).refresh(),
            child: ListView(
              padding: const EdgeInsets.fromLTRB(
                Insets.screenPadX,
                Insets.x4,
                Insets.screenPadX,
                Insets.x6,
              ),
              children: [
                if (sync.hasPending)
                  Padding(
                    padding: const EdgeInsets.only(bottom: Insets.x4),
                    child: NareBanner(
                      tone: BannerTone.info,
                      icon: Icons.cloud_upload_outlined,
                      title: sync.isOnline
                          ? 'Sincronizando tus registros'
                          : 'Sin conexión',
                      body: sync.isOnline
                          ? '${sync.pendingCount} registro(s) en camino al '
                              'servidor.'
                          : 'Guardamos ${sync.pendingCount} registro(s). Se '
                              'envían solos cuando vuelva la señal.',
                    ),
                  ),
                if (current == null)
                  const _NoCurrentService()
                else
                  _CurrentServiceCard(assignment: current),
                if (current != null && !current.status.isArrived) ...[
                  const SizedBox(height: Insets.x4),
                  _TrackingSection(assignment: current),
                ],
                if (others.isNotEmpty) ...[
                  const SizedBox(height: Insets.x6),
                  SectionHeader(
                    label: 'Otros servicios de hoy',
                    action: GhostButton(
                      label: 'Ver todos',
                      onPressed: onSeeAllServices,
                    ),
                  ),
                  const SizedBox(height: Insets.x2),
                  for (final a in others) ...[
                    ServiceCard(
                      assignment: a,
                      onMap: () => _openMap(context, a),
                    ),
                    const SizedBox(height: Insets.x3),
                  ],
                ],
              ],
            ),
          ),
        ),
        if (current != null) _BottomAction(assignment: current),
      ],
    );
  }
}

/// Tarjeta destacada del servicio en curso o próximo.
class _CurrentServiceCard extends ConsumerWidget {
  const _CurrentServiceCard({required this.assignment});

  final Assignment assignment;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Container(
      padding: const EdgeInsets.all(Insets.x5),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(Radii.md),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text('Persona a cuidar', style: AppText.label),
              ),
              StatusPill(status: assignment.status),
            ],
          ),
          const SizedBox(height: Insets.x2),
          Text(
            assignment.carePerson.nombreCompleto,
            style: AppText.displayMd,
          ),
          const SizedBox(height: Insets.x5),
          _Field(
            icon: Icons.place_outlined,
            label: 'Domicilio',
            value: assignment.address.calle,
            sub: assignment.address.localidad,
          ),
          const Padding(
            padding: EdgeInsets.symmetric(vertical: Insets.x4),
            child: Divider(),
          ),
          Row(
            children: [
              Expanded(
                child: _Field(
                  icon: Icons.schedule_outlined,
                  label: 'Horario',
                  valueWidget: Text(
                    Fmt.timeRange(assignment.startTime, assignment.endTime),
                    style: AppText.numeric(22),
                  ),
                  sub: Fmt.relativeDate(assignment.startTime),
                ),
              ),
            ],
          ),
          if (assignment.checkInAt != null) ...[
            const SizedBox(height: Insets.x4),
            NareBanner(
              tone: BannerTone.success,
              icon: Icons.where_to_vote_outlined,
              title: 'Llegada registrada — '
                  '${Fmt.time(assignment.checkInAt!)}',
            ),
          ],
          const SizedBox(height: Insets.x5),
          SecondaryButton(
            label: 'Ver mapa',
            icon: Icons.map_outlined,
            fullWidth: true,
            onPressed: () => _openMap(context, assignment),
          ),
        ],
      ),
    );
  }
}

class _Field extends StatelessWidget {
  const _Field({
    required this.icon,
    required this.label,
    this.value,
    this.valueWidget,
    this.sub,
  });

  final IconData icon;
  final String label;
  final String? value;
  final Widget? valueWidget;
  final String? sub;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 20, color: AppColors.ink500),
        const SizedBox(width: Insets.x3),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: AppText.label),
              const SizedBox(height: 3),
              valueWidget ??
                  Text(value ?? '', style: AppText.bodyStrong),
              if (sub != null) ...[
                const SizedBox(height: 2),
                Text(sub!, style: AppText.meta),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

class _NoCurrentService extends StatelessWidget {
  const _NoCurrentService();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: Insets.x5,
        vertical: Insets.x8,
      ),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(Radii.md),
        border: Border.all(color: AppColors.border),
      ),
      child: const NareEmptyView(
        icon: Icons.event_available_outlined,
        title: 'No tenés un servicio en curso',
        body: 'Cuando coordinación te asigne un servicio, vas a verlo acá.',
      ),
    );
  }
}

/// Botón crítico fijo al pie: LLEGUÉ o FIN DE SERVICIO según el estado.
class _BottomAction extends ConsumerWidget {
  const _BottomAction({required this.assignment});

  final Assignment assignment;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final arrived = assignment.status.isArrived;
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.surface,
        border: Border(top: BorderSide(color: AppColors.border)),
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(
            Insets.screenPadX,
            Insets.x3,
            Insets.screenPadX,
            Insets.x3,
          ),
          child: arrived
              ? PrimaryButton(
                  label: 'Fin de servicio',
                  icon: Icons.task_alt,
                  onPressed: () => _openEnd(context, assignment),
                )
              : CriticalButton(
                  label: 'Llegué',
                  icon: Icons.where_to_vote_outlined,
                  onPressed: () => _openArrival(context, assignment),
                ),
        ),
      ),
    );
  }
}

/// Sección de tracking previo al servicio: propone compartir la ubicación
/// dentro de la ventana previa y, una vez activo, lo informa con claridad.
class _TrackingSection extends ConsumerWidget {
  const _TrackingSection({required this.assignment});

  final Assignment assignment;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tracking = ref.watch(trackingControllerProvider);
    final config =
        ref.watch(mobileConfigProvider).value ?? MobileConfig.fallback;
    final isActive =
        tracking.active && tracking.assignmentId == assignment.id;

    if (isActive) {
      return Container(
        padding: const EdgeInsets.all(Insets.x4),
        decoration: BoxDecoration(
          color: AppColors.teal50,
          borderRadius: BorderRadius.circular(Radii.md),
          border: Border.all(color: AppColors.teal100),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(
                  Icons.my_location,
                  color: AppColors.primary,
                  size: 22,
                ),
                const SizedBox(width: Insets.x3),
                Expanded(
                  child: Text(
                    'Compartiendo tu ubicación',
                    style: AppText.h3,
                  ),
                ),
              ],
            ),
            const SizedBox(height: Insets.x2),
            Text(
              'Coordinación ve tu llegada. Se detiene al confirmar LLEGUÉ. '
              '${tracking.sampleCount} punto(s) enviado(s).',
              style: AppText.meta,
            ),
            const SizedBox(height: Insets.x2),
            GhostButton(
              label: 'Dejar de compartir',
              icon: Icons.location_disabled_outlined,
              onPressed: () =>
                  ref.read(trackingControllerProvider.notifier).stop(),
            ),
          ],
        ),
      );
    }

    final lead = Duration(minutes: config.trackingLeadMin);
    if (!assignment.startsWithin(lead)) {
      return const SizedBox.shrink();
    }

    return Container(
      padding: const EdgeInsets.all(Insets.x4),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(Radii.md),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Tu servicio está por empezar', style: AppText.h3),
          const SizedBox(height: Insets.x1),
          Text(
            'Compartí tu ubicación para que coordinación anticipe demoras. '
            'Se detiene en cuanto confirmás la llegada.',
            style: AppText.meta,
          ),
          const SizedBox(height: Insets.x3),
          SecondaryButton(
            label: 'Compartir mi ubicación',
            icon: Icons.my_location,
            fullWidth: true,
            onPressed: () => _start(context, ref, config),
          ),
        ],
      ),
    );
  }

  Future<void> _start(
    BuildContext context,
    WidgetRef ref,
    MobileConfig config,
  ) async {
    final navigator = Navigator.of(context);
    final result = await ref
        .read(trackingControllerProvider.notifier)
        .start(assignment.id, config);
    if (result != LocationPermissionResult.granted) {
      navigator.push(
        MaterialPageRoute(builder: (_) => const PermissionIntroScreen()),
      );
    }
  }
}

void _openMap(BuildContext context, Assignment assignment) {
  Navigator.of(context).push(
    MaterialPageRoute(builder: (_) => MapScreen(assignment: assignment)),
  );
}

void _openArrival(BuildContext context, Assignment assignment) {
  showNareBottomSheet(
    context: context,
    dismissible: false,
    builder: (_) => ArrivalSheet(assignment: assignment),
  );
}

void _openEnd(BuildContext context, Assignment assignment) {
  showNareBottomSheet(
    context: context,
    dismissible: false,
    builder: (_) => EndServiceSheet(assignment: assignment),
  );
}
