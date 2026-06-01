import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import '../../../core/theme/colors.dart';
import '../../../core/theme/spacing.dart';
import '../../../core/theme/typography.dart';
import '../../../core/utils/formatting.dart';
import '../../../data/models/assignment.dart';
import '../../../data/models/mobile_config.dart';
import '../../../state/assignments_controller.dart';
import '../../../state/providers.dart';
import '../../../state/tracking_controller.dart';
import '../../widgets/buttons.dart';
import '../../widgets/top_bar.dart';

/// Cada cuánto la pantalla toma una muestra de ubicación SOLO para visualizar
/// (no son los latidos reales del tracking, que van cada `trackingIntervalSec`).
const _sampleEvery = Duration(seconds: 3);

/// Una muestra de ubicación tomada por esta pantalla, con su geocercado ya
/// calculado, para mostrarla en el log.
class _Sample {
  _Sample({
    required this.at,
    required this.lat,
    required this.lng,
    required this.accuracy,
    required this.distanceM,
    required this.inside,
  });

  final DateTime at;
  final double lat;
  final double lng;
  final double accuracy;
  final double distanceM;
  final bool inside;
}

/// Pantalla de diagnóstico del tracking y el geocercado.
///
/// Muestra de forma visual cómo opera la ubicación: el domicilio del servicio,
/// el círculo del geocercado (radio `allowedRadiusM`), la posición actual del
/// teléfono y si cae dentro o fuera del radio (misma cuenta que hace el
/// backend al recibir cada latido). Es una herramienta de verificación: el
/// muestreo en vivo es cada pocos segundos para poder ver el cambio al moverse;
/// los latidos reales del tracking automático van mucho más espaciados.
class LocationDebugScreen extends ConsumerStatefulWidget {
  const LocationDebugScreen({super.key});

  @override
  ConsumerState<LocationDebugScreen> createState() =>
      _LocationDebugScreenState();
}

class _LocationDebugScreenState extends ConsumerState<LocationDebugScreen> {
  GoogleMapController? _map;
  Timer? _timer;
  Position? _current;
  String _permission = '—';
  String? _error;
  final List<_Sample> _log = [];

  @override
  void initState() {
    super.initState();
    _start();
  }

  Future<void> _start() async {
    // Acción explícita del prestador: acá sí pedimos permiso si hace falta.
    await ref.read(locationServiceProvider).ensurePermission();
    await _sample();
    _timer = Timer.periodic(_sampleEvery, (_) => _sample());
  }

  /// Asignación cuyo geocercado mostramos: la que está bajo tracking ahora; si
  /// ninguna, el servicio actual; si tampoco, el primero de hoy con domicilio
  /// geolocalizado.
  Assignment? _target() {
    final data = ref.read(assignmentsControllerProvider).value;
    if (data == null) return null;
    final config = ref.read(mobileConfigProvider).value ?? MobileConfig.fallback;
    final tracked = pickTrackingAssignment(data.today, config, DateTime.now());
    if (tracked != null) return tracked;
    if (data.current != null && data.current!.address.hasCoordinates) {
      return data.current;
    }
    for (final a in data.today) {
      if (a.address.hasCoordinates) return a;
    }
    return null;
  }

  Future<void> _sample() async {
    final location = ref.read(locationServiceProvider);
    final permission = await location.currentPermissionWire();
    final position = await location.currentPosition();
    if (!mounted) return;

    if (position == null) {
      setState(() {
        _permission = permission;
        _error = 'Sin señal GPS. En el simulador: Features → Location → '
            'Custom Location.';
      });
      return;
    }

    final target = _target();
    final addr = target?.address;
    double? distance;
    bool inside = false;
    if (addr != null && addr.hasCoordinates) {
      distance = Geolocator.distanceBetween(
        addr.latitude!,
        addr.longitude!,
        position.latitude,
        position.longitude,
      );
      inside = distance <= addr.allowedRadiusM;
    }

    setState(() {
      _current = position;
      _permission = permission;
      _error = null;
      if (distance != null) {
        _log.insert(
          0,
          _Sample(
            at: DateTime.now(),
            lat: position.latitude,
            lng: position.longitude,
            accuracy: position.accuracy,
            distanceM: distance,
            inside: inside,
          ),
        );
        if (_log.length > 30) _log.removeLast();
      }
    });

    // Centrar el mapa para que entren domicilio y posición actual.
    if (addr != null && addr.hasCoordinates && _map != null) {
      final sw = LatLng(
        addr.latitude! < position.latitude ? addr.latitude! : position.latitude,
        addr.longitude! < position.longitude
            ? addr.longitude!
            : position.longitude,
      );
      final ne = LatLng(
        addr.latitude! > position.latitude ? addr.latitude! : position.latitude,
        addr.longitude! > position.longitude
            ? addr.longitude!
            : position.longitude,
      );
      _map!.animateCamera(
        CameraUpdate.newLatLngBounds(
          LatLngBounds(southwest: sw, northeast: ne),
          80,
        ),
      );
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    _map?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final tracking = ref.watch(trackingControllerProvider);
    final config = ref.watch(mobileConfigProvider).value ?? MobileConfig.fallback;
    final target = _target();
    final addr = target?.address;

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: NareTopBar(
        title: 'Diagnóstico de ubicación',
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          color: AppColors.ink800,
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: target == null || addr == null || !addr.hasCoordinates
          ? _empty()
          : _content(target, config, tracking),
    );
  }

  Widget _empty() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(Insets.x6),
        child: Text(
          'No hay un servicio con domicilio geolocalizado para diagnosticar. '
          'Asigná un servicio con coordenadas y volvé a entrar.',
          textAlign: TextAlign.center,
          style: AppText.body.copyWith(color: AppColors.textMuted),
        ),
      ),
    );
  }

  Widget _content(
    Assignment target,
    MobileConfig config,
    TrackingState tracking,
  ) {
    final addr = target.address;
    final addrLatLng = LatLng(addr.latitude!, addr.longitude!);
    final last = _log.isNotEmpty ? _log.first : null;
    final inside = last?.inside ?? false;
    final geoColor = inside ? AppColors.success : AppColors.warning;

    return ListView(
      padding: const EdgeInsets.fromLTRB(
        Insets.screenPadX,
        Insets.x4,
        Insets.screenPadX,
        Insets.x6,
      ),
      children: [
        // Mapa con geocercado.
        SizedBox(
          height: 280,
          child: ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: GoogleMap(
              initialCameraPosition: CameraPosition(
                target: addrLatLng,
                zoom: 16,
              ),
              circles: {
                Circle(
                  circleId: const CircleId('geofence'),
                  center: addrLatLng,
                  radius: addr.allowedRadiusM.toDouble(),
                  fillColor: geoColor.withValues(alpha: 0.15),
                  strokeColor: geoColor,
                  strokeWidth: 2,
                ),
              },
              markers: {
                Marker(
                  markerId: const MarkerId('domicilio'),
                  position: addrLatLng,
                  icon: BitmapDescriptor.defaultMarkerWithHue(
                    BitmapDescriptor.hueRed,
                  ),
                  infoWindow: const InfoWindow(title: 'Domicilio'),
                ),
                if (_current != null)
                  Marker(
                    markerId: const MarkerId('actual'),
                    position: LatLng(
                      _current!.latitude,
                      _current!.longitude,
                    ),
                    icon: BitmapDescriptor.defaultMarkerWithHue(
                      BitmapDescriptor.hueAzure,
                    ),
                    infoWindow: const InfoWindow(title: 'Estás acá'),
                  ),
              },
              myLocationButtonEnabled: false,
              zoomControlsEnabled: false,
              onMapCreated: (c) => _map = c,
            ),
          ),
        ),
        const SizedBox(height: Insets.x3),

        // Badge dentro/fuera + distancia.
        if (last != null)
          Container(
            padding: const EdgeInsets.symmetric(
              horizontal: Insets.x4,
              vertical: Insets.x3,
            ),
            decoration: BoxDecoration(
              color: geoColor.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(Radii.md),
              border: Border.all(color: geoColor),
            ),
            child: Row(
              children: [
                Icon(
                  inside ? Icons.check_circle : Icons.error_outline,
                  color: geoColor,
                ),
                const SizedBox(width: Insets.x3),
                Expanded(
                  child: Text(
                    inside
                        ? 'DENTRO del geocercado'
                        : 'FUERA del geocercado',
                    style: AppText.bodyStrong.copyWith(color: geoColor),
                  ),
                ),
                Text(
                  '${last.distanceM.round()} m',
                  style: AppText.numeric(20).copyWith(color: geoColor),
                ),
              ],
            ),
          )
        else if (_error != null)
          Container(
            padding: const EdgeInsets.all(Insets.x4),
            decoration: BoxDecoration(
              color: AppColors.coral50,
              borderRadius: BorderRadius.circular(Radii.md),
              border: Border.all(color: AppColors.coral100),
            ),
            child: Text(_error!, style: AppText.body),
          ),
        const SizedBox(height: Insets.x4),

        // Datos del geocercado y la posición.
        _SectionLabel('Geocercado'),
        _Card(children: [
          _row('Domicilio', '${addr.calle}, ${addr.ciudad}'),
          const Divider(height: Insets.x5),
          _row('Centro (lat, lng)',
              '${addr.latitude!.toStringAsFixed(5)}, ${addr.longitude!.toStringAsFixed(5)}'),
          const Divider(height: Insets.x5),
          _row('Radio permitido', '${addr.allowedRadiusM} m'),
          const Divider(height: Insets.x5),
          _row(
            'Posición actual',
            _current == null
                ? '—'
                : '${_current!.latitude.toStringAsFixed(5)}, '
                    '${_current!.longitude.toStringAsFixed(5)}',
          ),
          const Divider(height: Insets.x5),
          _row('Precisión GPS',
              _current == null ? '—' : '± ${_current!.accuracy.round()} m'),
        ]),
        const SizedBox(height: Insets.x4),

        // Estado del tracking automático REAL.
        _SectionLabel('Tracking automático (real)'),
        _Card(children: [
          _row('Estado', tracking.active ? 'ACTIVO' : 'Inactivo',
              valueColor: tracking.active ? AppColors.success : AppColors.ink600),
          const Divider(height: Insets.x5),
          _row('Permiso de ubicación', _permission),
          const Divider(height: Insets.x5),
          _row('Latidos enviados (real)', '${tracking.sampleCount}'),
          const Divider(height: Insets.x5),
          _row('Intervalo de latido', '${config.trackingIntervalSec} s'),
          const Divider(height: Insets.x5),
          _row('Ventana de tracking',
              '${Fmt.time(target.startTime.subtract(Duration(minutes: config.trackingLeadMin)))}'
              ' → ${Fmt.time(target.endTime.add(Duration(minutes: config.trackingTrailMin)))}'),
        ]),
        const SizedBox(height: Insets.x4),

        // Log de muestras en vivo (de esta pantalla).
        Row(
          children: [
            Expanded(child: _SectionLabel('Muestras en vivo (cada 3 s)')),
            SecondaryButton(
              label: 'Muestrear',
              icon: Icons.my_location,
              onPressed: _sample,
            ),
          ],
        ),
        const SizedBox(height: Insets.x2),
        if (_log.isEmpty)
          Text('Esperando ubicación…',
              style: AppText.meta)
        else
          _Card(
            padded: false,
            children: [
              for (var i = 0; i < _log.length; i++) ...[
                if (i > 0) const Divider(height: 1),
                _LogRow(sample: _log[i]),
              ],
            ],
          ),
        const SizedBox(height: Insets.x4),
        Text(
          'El muestreo de esta pantalla es cada 3 s solo para verlo en vivo. '
          'Los latidos reales del tracking van cada ${config.trackingIntervalSec} s '
          'y el geocercado lo calcula el backend con la misma fórmula '
          '(distancia ≤ radio).',
          style: AppText.label.copyWith(letterSpacing: 0),
        ),
      ],
    );
  }

  Widget _row(String label, String value, {Color? valueColor}) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Text(label, style: AppText.label.copyWith(letterSpacing: 0)),
        ),
        const SizedBox(width: Insets.x3),
        Flexible(
          child: Text(
            value,
            textAlign: TextAlign.right,
            style: AppText.bodyStrong.copyWith(color: valueColor),
          ),
        ),
      ],
    );
  }
}

class _LogRow extends StatelessWidget {
  const _LogRow({required this.sample});
  final _Sample sample;

  @override
  Widget build(BuildContext context) {
    final color = sample.inside ? AppColors.success : AppColors.warning;
    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: Insets.x4,
        vertical: Insets.x3,
      ),
      child: Row(
        children: [
          Icon(
            sample.inside ? Icons.check_circle : Icons.error_outline,
            size: 18,
            color: color,
          ),
          const SizedBox(width: Insets.x3),
          Expanded(
            child: Text(
              '${Fmt.time(sample.at)} · ${sample.lat.toStringAsFixed(5)}, '
              '${sample.lng.toStringAsFixed(5)}',
              style: AppText.meta.copyWith(color: AppColors.text),
            ),
          ),
          Text(
            '${sample.distanceM.round()} m',
            style: AppText.bodyStrong.copyWith(color: color),
          ),
        ],
      ),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.text);
  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: Insets.x2, left: Insets.x1),
      child: Text(text.toUpperCase(), style: AppText.label),
    );
  }
}

class _Card extends StatelessWidget {
  const _Card({required this.children, this.padded = true});
  final List<Widget> children;
  final bool padded;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: padded ? const EdgeInsets.all(Insets.x4 + 2) : EdgeInsets.zero,
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(Radii.md),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: children,
      ),
    );
  }
}
