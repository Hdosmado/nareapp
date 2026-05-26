import 'package:flutter/material.dart';

/// Envoltorio táctil del design system: al presionar, el contenido se encoge
/// a scale(0.97) en 80ms. Es la única animación de interacción — feedback
/// inmediato, sin distracciones.
class PressableScale extends StatefulWidget {
  const PressableScale({
    super.key,
    required this.child,
    this.onTap,
    this.enabled = true,
  });

  final Widget child;
  final VoidCallback? onTap;
  final bool enabled;

  @override
  State<PressableScale> createState() => _PressableScaleState();
}

class _PressableScaleState extends State<PressableScale> {
  bool _pressed = false;

  void _setPressed(bool value) {
    if (!widget.enabled) return;
    if (_pressed != value) setState(() => _pressed = value);
  }

  @override
  Widget build(BuildContext context) {
    final active = widget.enabled && widget.onTap != null;
    return GestureDetector(
      onTap: active ? widget.onTap : null,
      onTapDown: (_) => _setPressed(true),
      onTapUp: (_) => _setPressed(false),
      onTapCancel: () => _setPressed(false),
      child: AnimatedScale(
        scale: _pressed ? 0.97 : 1,
        duration: const Duration(milliseconds: 80),
        curve: const Cubic(0.2, 0.7, 0.2, 1),
        child: Opacity(
          opacity: widget.enabled ? 1 : 0.4,
          child: widget.child,
        ),
      ),
    );
  }
}
