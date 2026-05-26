import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/colors.dart';
import '../../../core/theme/spacing.dart';
import '../../../data/models/assignment.dart';
import '../../../state/assignments_controller.dart';
import '../../widgets/section_header.dart';
import '../../widgets/service_card.dart';
import '../../widgets/status_views.dart';
import '../../widgets/top_bar.dart';
import '../service/map_screen.dart';

/// Lista de servicios asignados, agrupada en "Hoy" (en curso o ya iniciados)
/// y "Próximos" (los que todavía no empezaron).
class ServicesScreen extends ConsumerWidget {
  const ServicesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final assignments = ref.watch(assignmentsControllerProvider);

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: const NareTopBar(title: 'Mis servicios'),
      body: assignments.when(
        loading: () => const NareLoading(),
        error: (_, _) => NareErrorView(
          message: 'No pudimos cargar tus servicios.',
          onRetry: () =>
              ref.read(assignmentsControllerProvider.notifier).refresh(),
        ),
        data: (data) => _ServicesList(today: data.today),
      ),
    );
  }
}

class _ServicesList extends ConsumerWidget {
  const _ServicesList({required this.today});

  final List<Assignment> today;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final now = DateTime.now();
    final sorted = [...today]
      ..sort((a, b) => a.startTime.compareTo(b.startTime));
    final proximos =
        sorted.where((a) => a.startTime.isAfter(now)).toList();
    final enCurso =
        sorted.where((a) => !a.startTime.isAfter(now)).toList();

    Future<void> refresh() =>
        ref.read(assignmentsControllerProvider.notifier).refresh();

    if (today.isEmpty) {
      return RefreshIndicator(
        color: AppColors.primary,
        onRefresh: refresh,
        child: ListView(
          children: const [
            SizedBox(height: 120),
            NareEmptyView(
              icon: Icons.calendar_today_outlined,
              title: 'No tenés servicios para hoy',
              body: 'Cuando coordinación te asigne servicios, aparecen acá.',
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      color: AppColors.primary,
      onRefresh: refresh,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(
          Insets.screenPadX,
          Insets.x4,
          Insets.screenPadX,
          Insets.x6,
        ),
        children: [
          if (enCurso.isNotEmpty) ...[
            const SectionHeader(label: 'Hoy'),
            const SizedBox(height: Insets.x2),
            for (final a in enCurso) ...[
              ServiceCard(
                assignment: a,
                onMap: () => _openMap(context, a),
              ),
              const SizedBox(height: Insets.x3),
            ],
          ],
          if (proximos.isNotEmpty) ...[
            const SizedBox(height: Insets.x3),
            const SectionHeader(label: 'Próximos'),
            const SizedBox(height: Insets.x2),
            for (final a in proximos) ...[
              ServiceCard(
                assignment: a,
                onMap: () => _openMap(context, a),
              ),
              const SizedBox(height: Insets.x3),
            ],
          ],
        ],
      ),
    );
  }

  void _openMap(BuildContext context, Assignment assignment) {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => MapScreen(assignment: assignment)),
    );
  }
}
