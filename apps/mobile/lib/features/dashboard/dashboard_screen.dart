import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../shared/theme.dart';
import '../../shared/widgets/status_badge.dart';
import '../../shared/services/supabase_service.dart';

final dashboardDataProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final client = Supabase.instance.client;

  final [pendingRes, inTransitRes, lowStockRes, recentRes] = await Future.wait([
    client.from('transfers').select('id').eq('status', 'PENDING_APPROVAL'),
    client.from('transfers').select('id').eq('status', 'IN_TRANSIT'),
    client.rpc('get_low_stock_alerts'),
    client.from('stock_ledger')
        .select('id, movement_type, quantity_change, created_at, variant:product_variants(item_code, name)')
        .order('created_at', ascending: false)
        .limit(5),
  ]);

  return {
    'pending':   (pendingRes   as List).length,
    'inTransit': (inTransitRes as List).length,
    'lowStock':  (lowStockRes  as List).length,
    'recent':    recentRes as List,
  };
});

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final data = ref.watch(dashboardDataProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Madeenas Stock'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout_rounded, size: 20),
            onPressed: () async {
              await Supabase.instance.client.auth.signOut();
              if (context.mounted) context.go('/login');
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        color: kGold,
        onRefresh: () => ref.refresh(dashboardDataProvider.future),
        child: data.when(
          loading: () => const Center(child: CircularProgressIndicator(color: kGold)),
          error: (e, _) => Center(child: Text('Error: $e', style: const TextStyle(color: Colors.red))),
          data: (d) => ListView(
            padding: const EdgeInsets.all(16),
            children: [
              // Greeting
              const Text('Overview', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: Colors.white)),
              const SizedBox(height: 4),
              Text('Today\'s stock summary', style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 13)),
              const SizedBox(height: 20),

              // KPI cards
              GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                childAspectRatio: 1.4,
                children: [
                  _KPICard(label: 'Pending Approval', value: '${d['pending']}', color: const Color(0xFFF59E0B), onTap: () => context.go('/transfers')),
                  _KPICard(label: 'In Transit',       value: '${d['inTransit']}', color: const Color(0xFF8B5CF6), onTap: () => context.go('/transfers')),
                  _KPICard(label: 'Low Stock Alerts', value: '${d['lowStock']}', color: const Color(0xFFEF4444), onTap: () {}),
                  _KPICard(label: 'New Transfer',     value: '+', color: kGold, onTap: () => context.go('/transfers/new')),
                ],
              ),
              const SizedBox(height: 24),

              // Recent activity
              const Text('Recent Movements', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Colors.white)),
              const SizedBox(height: 12),
              ...(d['recent'] as List).map((row) => _LedgerRow(row: row as Map<String, dynamic>)),
            ],
          ),
        ),
      ),
    );
  }
}

class _KPICard extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  final VoidCallback onTap;
  const _KPICard({required this.label, required this.value, required this.color, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: kNavy2,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withOpacity(0.3)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Container(
              width: 32, height: 32,
              decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
              child: Icon(Icons.trending_up_rounded, color: color, size: 18),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(value, style: TextStyle(fontSize: 24, fontWeight: FontWeight.w700, color: color)),
                Text(label, style: const TextStyle(fontSize: 11, color: kMuted)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _LedgerRow extends StatelessWidget {
  final Map<String, dynamic> row;
  const _LedgerRow({required this.row});

  @override
  Widget build(BuildContext context) {
    final variant = row['variant'] as Map<String, dynamic>?;
    final change  = (row['quantity_change'] as num).toDouble();
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: kNavy2,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: kBorder),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(variant?['item_code'] ?? '—', style: const TextStyle(fontFamily: 'monospace', fontSize: 11, color: kGold)),
                const SizedBox(height: 2),
                Text(variant?['name'] ?? '—', style: const TextStyle(fontSize: 13, color: Colors.white), maxLines: 1, overflow: TextOverflow.ellipsis),
              ],
            ),
          ),
          Text(
            '${change >= 0 ? '+' : ''}${change.toStringAsFixed(0)}',
            style: TextStyle(
              fontFamily: 'monospace', fontSize: 14, fontWeight: FontWeight.w700,
              color: change >= 0 ? const Color(0xFF10B981) : const Color(0xFFEF4444),
            ),
          ),
        ],
      ),
    );
  }
}
