import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme/colors.dart';
import '../../../core/theme/spacing.dart';
import '../../../core/theme/typography.dart';
import '../../../data/models/assignment.dart';
import '../../widgets/buttons.dart';
import '../../widgets/faux_map.dart';
import '../../widgets/top_bar.dart';

/// Pantalla de mapa del domicilio. El MVP muestra un mapa de reemplazo y
/// delega la navegación real a Google Maps mediante un deep link `geo:`.
class MapScreen extends StatelessWidget {
  const MapScreen({super.key, required this.assignment});

  final Assignment assignment;

  Future<void> _openGoogleMaps(BuildContext context) async {
    final address = assignment.address;
    final label = Uri.encodeComponent(
      '${address.calle}, ${address.ciudad}',
    );

    final Uri geoUri;
    final Uri webUri;
    if (address.hasCoordinates) {
      final coords = '${address.latitude},${address.longitude}';
      geoUri = Uri.parse('geo:$coords?q=$coords($label)');
      webUri = Uri.parse(
        'https://www.google.com/maps/search/?api=1&query=$coords',
      );
    } else {
      final query = Uri.encodeComponent(
        '${address.calle}, ${address.ciudad}, ${address.provincia}',
      );
      geoUri = Uri.parse('geo:0,0?q=$query');
      webUri = Uri.parse(
        'https://www.google.com/maps/search/?api=1&query=$query',
      );
    }

    final messenger = ScaffoldMessenger.of(context);
    try {
      if (await canLaunchUrl(geoUri)) {
        await launchUrl(geoUri, mode: LaunchMode.externalApplication);
        return;
      }
      await launchUrl(webUri, mode: LaunchMode.externalApplication);
    } catch (_) {
      messenger.showSnackBar(
        const SnackBar(
          content: Text('No se pudo abrir Google Maps en este teléfono.'),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final address = assignment.address;
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: NareTopBar(
        title: 'Cómo llegar',
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
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(Insets.screenPadX),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const FauxMap(height: 260),
                    const SizedBox(height: Insets.x3),
                    Text(
                      'Vista de referencia. Tocá "Abrir Google Maps" para '
                      'la navegación paso a paso.',
                      style: AppText.label.copyWith(letterSpacing: 0),
                    ),
                    const SizedBox(height: Insets.x5),
                    Text('Domicilio', style: AppText.label),
                    const SizedBox(height: Insets.x1 + 2),
                    Text(address.calle, style: AppText.h3),
                    const SizedBox(height: 2),
                    Text(address.localidad, style: AppText.meta),
                    const SizedBox(height: Insets.x5),
                    Text('Persona a cuidar', style: AppText.label),
                    const SizedBox(height: Insets.x1 + 2),
                    Text(
                      assignment.carePerson.nombreCompleto,
                      style: AppText.h3,
                    ),
                  ],
                ),
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
                label: 'ABRIR GOOGLE MAPS',
                icon: Icons.open_in_new,
                onPressed: () => _openGoogleMaps(context),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
