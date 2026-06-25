import 'package:flutter/material.dart';

class StatusBadge extends StatelessWidget {
  final String status;
  const StatusBadge({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    final (color, bg) = _colorsFor(status);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withOpacity(0.4)),
      ),
      child: Text(
        status.replaceAll('_', ' '),
        style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.w600, letterSpacing: 0.3),
      ),
    );
  }

  (Color, Color) _colorsFor(String status) {
    return switch (status) {
      'DRAFT'            => (Colors.grey.shade400, Colors.grey.withOpacity(0.1)),
      'PENDING_APPROVAL' => (const Color(0xFFF59E0B), const Color(0xFFF59E0B10)),
      'APPROVED'         => (const Color(0xFF3B82F6), const Color(0xFF3B82F610)),
      'IN_TRANSIT'       => (const Color(0xFF8B5CF6), const Color(0xFF8B5CF610)),
      'RECEIVED'         => (const Color(0xFF10B981), const Color(0xFF10B98110)),
      'REJECTED'         => (const Color(0xFFEF4444), const Color(0xFFEF444410)),
      'CANCELLED'        => (Colors.grey.shade600, Colors.grey.withOpacity(0.05)),
      'CONFIRMED'        => (const Color(0xFF10B981), const Color(0xFF10B98110)),
      _                  => (Colors.grey, Colors.grey.withOpacity(0.1)),
    };
  }
}
