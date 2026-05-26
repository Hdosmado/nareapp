import 'package:flutter/material.dart';

import '../../../core/theme/colors.dart';
import '../../../core/theme/spacing.dart';
import '../../../core/theme/typography.dart';
import '../../widgets/top_bar.dart';

/// Pantalla de privacidad. Texto pensado para las tiendas de aplicaciones:
/// explica qué datos se usan, cuándo y para qué.
class PrivacyScreen extends StatelessWidget {
  const PrivacyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: NareTopBar(
        title: 'Privacidad',
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          color: AppColors.ink800,
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(Insets.screenPadX),
        children: const [
          _Block(
            title: 'Para qué usamos tu ubicación',
            body: 'NareApp usa la ubicación de este teléfono para que '
                'coordinación pueda anticipar tardanzas y ausencias en los '
                'servicios de cuidado domiciliario. Es una herramienta '
                'operativa, no de control personal.',
          ),
          _Block(
            title: 'El GPS no funciona todo el tiempo',
            body: 'La app no hace seguimiento permanente. La ubicación solo '
                'se comparte en la ventana previa al inicio de un servicio y '
                'se detiene en cuanto confirmás la llegada con LLEGUÉ. '
                'Mientras se comparte, vas a ver una notificación visible: '
                'siempre sabés cuándo está activa.',
          ),
          _Block(
            title: 'Qué datos registramos',
            body: 'Registramos la confirmación de llegada y el fin de cada '
                'servicio, con la hora y la ubicación del momento. También '
                'datos básicos del teléfono (modelo y versión del sistema) '
                'para vincularlo a tu cuenta de prestador.',
          ),
          _Block(
            title: 'Funcionamiento sin conexión',
            body: 'Si no tenés señal, los registros se guardan en el '
                'teléfono y se envían solos cuando la conexión vuelve. '
                'Ningún dato se pierde.',
          ),
          _Block(
            title: 'Quién ve tus datos',
            body: 'Los datos los usa el equipo de coordinación para operar '
                'los servicios. No se comparten con terceros para fines '
                'publicitarios.',
          ),
          _Block(
            title: 'Tus controles',
            body: 'Podés revocar el permiso de ubicación desde los ajustes '
                'del teléfono. También podés desvincular este teléfono desde '
                'la pantalla de Cuenta.',
          ),
        ],
      ),
    );
  }
}

class _Block extends StatelessWidget {
  const _Block({required this.title, required this.body});
  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: Insets.x5),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: AppText.h3),
          const SizedBox(height: Insets.x2),
          Text(
            body,
            style: AppText.body.copyWith(color: AppColors.textMuted),
          ),
        ],
      ),
    );
  }
}
