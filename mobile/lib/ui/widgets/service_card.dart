import 'package:flutter/material.dart';

import '../../core/theme/colors.dart';
import '../../core/theme/spacing.dart';
import '../../core/theme/typography.dart';
import '../../core/utils/formatting.dart';
import '../../data/models/assignment.dart';
import 'pressable.dart';
import 'status_pill.dart';

/// Tarjeta de un servicio asignado para las listas. Muestra la persona a
/// cuidar, el domicilio, el horario y el estado.
class ServiceCard extends StatelessWidget {
  const ServiceCard({
    super.key,
    required this.assignment,
    this.onTap,
    this.onMap,
  });

  final Assignment assignment;
  final VoidCallback? onTap;
  final VoidCallback? onMap;

  @override
  Widget build(BuildContext context) {
    return PressableScale(
      enabled: onTap != null,
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(Insets.x4 + 2),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(Radii.md),
          border: Border.all(color: AppColors.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        assignment.carePerson.nombreCompleto,
                        style: AppText.h3.copyWith(fontSize: 17),
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        assignment.address.calle,
                        style: AppText.body.copyWith(
                          fontSize: 14,
                          color: AppColors.ink700,
                          height: 1.35,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        assignment.address.localidad,
                        style: AppText.label.copyWith(letterSpacing: 0),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: Insets.x3),
                StatusPill(status: assignment.status, small: true),
              ],
            ),
            const Padding(
              padding: EdgeInsets.symmetric(vertical: Insets.x3),
              child: Divider(),
            ),
            Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        Fmt.relativeDate(assignment.startTime),
                        style: AppText.label.copyWith(letterSpacing: 0),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        Fmt.timeRange(
                          assignment.startTime,
                          assignment.endTime,
                        ),
                        style: AppText.numeric(19),
                      ),
                    ],
                  ),
                ),
                if (onMap != null)
                  PressableScale(
                    onTap: onMap,
                    child: Container(
                      height: 40,
                      padding: const EdgeInsets.symmetric(
                        horizontal: Insets.x3 + 2,
                      ),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(Radii.sm + 2),
                        border: Border.all(color: AppColors.border, width: 1.5),
                      ),
                      child: Row(
                        children: [
                          const Icon(
                            Icons.map_outlined,
                            size: 16,
                            color: AppColors.ink800,
                          ),
                          const SizedBox(width: Insets.x1 + 2),
                          Text(
                            'Mapa',
                            style: AppText.button.copyWith(
                              fontSize: 14,
                              color: AppColors.ink800,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
