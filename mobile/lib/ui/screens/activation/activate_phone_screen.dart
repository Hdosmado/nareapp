import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/colors.dart';
import '../../../core/theme/spacing.dart';
import '../../../core/theme/typography.dart';
import '../../../data/api/api_exception.dart';
import '../../../state/providers.dart';
import '../../../state/session_controller.dart';
import '../../widgets/banner.dart';
import '../../widgets/buttons.dart';
import '../../widgets/code_field.dart';
import '../../widgets/nare_text_field.dart';
import '../../widgets/wordmark.dart';
import '../auth/login_screen.dart';
import 'qr_scan_screen.dart';

/// Primera pantalla tras instalar la app: el prestador activa su teléfono con
/// el código numérico de 8 dígitos que le pasó coordinación. El QR queda como
/// alternativa secundaria para el caso presencial.
class ActivatePhoneScreen extends ConsumerStatefulWidget {
  const ActivatePhoneScreen({super.key});

  @override
  ConsumerState<ActivatePhoneScreen> createState() =>
      _ActivatePhoneScreenState();
}

class _ActivatePhoneScreenState extends ConsumerState<ActivatePhoneScreen> {
  String _code = '';
  bool _loading = false;
  String? _error;
  String _serverUrl = '';

  bool get _complete => _code.length == 8;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final url = await ref.read(serverConfigStoreProvider).effectiveUrl();
      if (mounted) setState(() => _serverUrl = url);
    });
  }

  /// Permite cambiar la URL del backend sin recompilar (útil para probar
  /// contra un emulador o una IP de red local distinta).
  Future<void> _editServer() async {
    final controller = TextEditingController(text: _serverUrl);
    final nuevo = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(Radii.lg),
        ),
        title: Text('Servidor de NareApp', style: AppText.h2),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            NareTextField(
              label: 'URL del backend',
              controller: controller,
              hint: 'http://10.0.2.2:3000',
              keyboardType: TextInputType.url,
              help: 'Emulador: 10.0.2.2 · Teléfono: la IP de red de la PC',
            ),
          ],
        ),
        actions: [
          GhostButton(
            label: 'Cancelar',
            onPressed: () => Navigator.of(context).pop(),
          ),
          GhostButton(
            label: 'Guardar',
            onPressed: () => Navigator.of(context).pop(controller.text.trim()),
          ),
        ],
      ),
    );
    if (nuevo == null || nuevo.isEmpty) return;
    await ref.read(serverConfigStoreProvider).save(nuevo);
    ref.read(apiClientProvider).setBaseUrl(nuevo);
    if (mounted) {
      setState(() {
        _serverUrl = nuevo;
        _error = null;
      });
    }
  }

  Future<void> _activate() async {
    if (!_complete || _loading) return;
    FocusScope.of(context).unfocus();
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await ref.read(sessionControllerProvider.notifier).activateWithCode(_code);
      // Si la activación funciona, la raíz pasa sola a la app operativa.
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) {
        setState(() => _error = 'No se pudo activar la app. Intentá de nuevo.');
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _scanQr() async {
    final token = await Navigator.of(context).push<String>(
      MaterialPageRoute(builder: (_) => const QrScanScreen()),
    );
    if (token == null || !mounted) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await ref
          .read(sessionControllerProvider.notifier)
          .activateWithToken(token);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) {
        setState(() => _error = 'No se pudo activar la app. Intentá de nuevo.');
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _openLogin() {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const LoginScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(
                  Insets.screenPadX,
                  Insets.x7,
                  Insets.screenPadX,
                  Insets.x5,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const NareWordmark(fontSize: 38),
                    const SizedBox(height: Insets.x7),
                    Text('Activar mi teléfono', style: AppText.h1),
                    const SizedBox(height: Insets.x3),
                    Text(
                      'Coordinación te pasó un código de 8 dígitos por '
                      'teléfono o WhatsApp. Ingresalo para activar la app en '
                      'este teléfono.',
                      style: AppText.body.copyWith(color: AppColors.textMuted),
                    ),
                    const SizedBox(height: Insets.x6),
                    Text(
                      'Código de activación',
                      style: AppText.meta.copyWith(
                        color: AppColors.ink800,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: Insets.x2),
                    CodeField(
                      enabled: !_loading,
                      onChanged: (value) {
                        setState(() {
                          _code = value;
                          _error = null;
                        });
                      },
                      onCompleted: (_) => _activate(),
                    ),
                    const SizedBox(height: Insets.x3),
                    Text(
                      'El código es de un solo uso y vence a las 24 horas.',
                      style: AppText.label.copyWith(letterSpacing: 0),
                    ),
                    if (_error != null) ...[
                      const SizedBox(height: Insets.x5),
                      NareBanner(
                        tone: BannerTone.danger,
                        title: 'No se pudo activar',
                        body: _error,
                      ),
                    ],
                    const SizedBox(height: Insets.x7),
                    Center(
                      child: SecondaryButton(
                        label: 'Escanear QR',
                        icon: Icons.qr_code_scanner,
                        onPressed: _loading ? null : _scanQr,
                      ),
                    ),
                    const SizedBox(height: Insets.x2),
                    Center(
                      child: GhostButton(
                        label: 'Ya activé este teléfono, ingresar',
                        onPressed: _loading ? null : _openLogin,
                      ),
                    ),
                    const SizedBox(height: Insets.x5),
                    Center(
                      child: TextButton.icon(
                        onPressed: _loading ? null : _editServer,
                        icon: const Icon(
                          Icons.dns_outlined,
                          size: 16,
                          color: AppColors.textFaint,
                        ),
                        label: Text(
                          'Servidor: ${_serverUrl.isEmpty ? '—' : _serverUrl}',
                          style: AppText.label.copyWith(letterSpacing: 0),
                        ),
                      ),
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
                label: 'Activar',
                loading: _loading,
                onPressed: _complete ? _activate : null,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
