import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme/colors.dart';
import '../../../core/theme/spacing.dart';
import '../../../core/theme/typography.dart';
import '../../../data/models/assignment.dart';
import '../../../state/providers.dart';
import '../../widgets/buttons.dart';
import '../../widgets/faux_map.dart';
import '../../widgets/top_bar.dart';

/// Pantalla "Cómo llegar" con `GoogleMap` embebido: muestra el marker del
/// domicilio y la ubicación actual del prestador, y conserva el botón
/// "Abrir Google Maps" como fallback para la navegación paso a paso.
class MapScreen extends ConsumerStatefulWidget {
  const MapScreen({super.key, required this.assignment});

  final Assignment assignment;

  @override
  ConsumerState<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends ConsumerState<MapScreen> {
  GoogleMapController? _controller;
  LatLng? _currentLocation;

  @override
  void initState() {
    super.initState();
    _refreshCurrentLocation();
  }

  /// Carga, best-effort, la ubicación actual del prestador para mostrar
  /// el segundo marker. No pide permisos nuevos: si no hay, se omite.
  Future<void> _refreshCurrentLocation() async {
    final location = ref.read(locationServiceProvider);
    final position = await location.currentPosition();
    if (position != null && mounted) {
      setState(() {
        _currentLocation = LatLng(position.latitude, position.longitude);
      });
    }
  }

  Future<void> _openGoogleMaps() async {
    final address = widget.assignment.address;
    final label = Uri.encodeComponent('${address.calle}, ${address.ciudad}');

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

  /// Markers del domicilio y de la ubicación actual del prestador, si la
  /// tenemos. El marker actual usa un tono distinto para diferenciarlo.
  Set<Marker> _markers(LatLng address) {
    final markers = <Marker>{
      Marker(
        markerId: const MarkerId('domicilio'),
        position: address,
        icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed),
        infoWindow: const InfoWindow(title: 'Domicilio'),
      ),
    };
    if (_currentLocation != null) {
      markers.add(
        Marker(
          markerId: const MarkerId('actual'),
          position: _currentLocation!,
          icon: BitmapDescriptor.defaultMarkerWithHue(
            BitmapDescriptor.hueAzure,
          ),
          infoWindow: const InfoWindow(title: 'Estás acá'),
        ),
      );
    }
    return markers;
  }

  @override
  Widget build(BuildContext context) {
    final address = widget.assignment.address;
    final hasAddressCoords = address.hasCoordinates;
    final addressLatLng = hasAddressCoords
        ? LatLng(address.latitude!, address.longitude!)
        : null;

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
                    if (addressLatLng != null)
                      SizedBox(
                        height: 260,
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(12),
                          child: GoogleMap(
                            initialCameraPosition: CameraPosition(
                              target: addressLatLng,
                              zoom: 15,
                            ),
                            markers: _markers(addressLatLng),
                            myLocationButtonEnabled: false,
                            zoomControlsEnabled: false,
                            onMapCreated: (controller) {
                              _controller = controller;
                            },
                          ),
                        ),
                      )
                    else
                      const FauxMap(height: 260),
                    const SizedBox(height: Insets.x3),
                    Text(
                      addressLatLng != null
                          ? 'Tocá "Abrir Google Maps" para la navegación paso a paso.'
                          : 'Vista de referencia. Tocá "Abrir Google Maps" para la navegación paso a paso.',
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
                      widget.assignment.carePerson.nombreCompleto,
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
                onPressed: _openGoogleMaps,
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }
}
