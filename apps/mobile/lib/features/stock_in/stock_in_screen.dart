import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../shared/theme.dart';

final stockInListProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final res = await Supabase.instance.client
      .from('stock_ins')
      .select('''
        id, status, supplier_name, received_date,
        location:locations(name),
        stock_in_items(quantity, cost_price)
      ''')
      .order('received_date', ascending: false)
      .limit(50);
  return List<Map<String, dynamic>>.from(res);
});

class StockInScreen extends ConsumerWidget {
  const StockInScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final listAsync = ref.watch(stockInListProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Stock In')),
      body: RefreshIndicator(
        color: kGold,
        onRefresh: () => ref.refresh(stockInListProvider.future),
        child: listAsync.when(
          loading: () => const Center(child: CircularProgressIndicator(color: kGold)),
          error: (e, _) => Center(child: Text('Error: $e', style: const TextStyle(color: Colors.red))),
          data: (list) => list.isEmpty
              ? const Center(child: Text('No stock-in records', style: TextStyle(color: kMuted)))
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: list.length,
                  itemBuilder: (ctx, i) => _StockInCard(entry: list[i]),
                ),
        ),
      ),
    );
  }
}

class _StockInCard extends StatelessWidget {
  final Map<String, dynamic> entry;
  const _StockInCard({required this.entry});

  @override
  Widget build(BuildContext context) {
    final location = (entry['location'] as Map<String, dynamic>?)?['name'] ?? '—';
    final items    = (entry['stock_in_items'] as List?)?.length ?? 0;
    final value    = (entry['stock_in_items'] as List? ?? []).fold<double>(0, (s, i) {
      final m = i as Map<String, dynamic>;
      return s + (m['quantity'] as num) * (m['cost_price'] as num);
    });
    final dt  = DateTime.tryParse(entry['received_date'] ?? '');
    final fmt = dt != null ? DateFormat('dd MMM yyyy').format(dt) : '';
    final confirmed = entry['status'] == 'CONFIRMED';

    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(child: Text(entry['supplier_name'] ?? '—', style: const TextStyle(fontWeight: FontWeight.w600, color: Colors.white, fontSize: 14))),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: confirmed ? const Color(0xFF10B98115) : const Color(0xFF64748B15),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: confirmed ? const Color(0xFF10B981) : const Color(0xFF64748B), width: 0.5),
                  ),
                  child: Text(
                    entry['status'] ?? '',
                    style: TextStyle(color: confirmed ? const Color(0xFF10B981) : kMuted, fontSize: 10, fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Row(
              children: [
                const Icon(Icons.location_on_outlined, size: 12, color: kMuted),
                const SizedBox(width: 4),
                Text(location, style: const TextStyle(fontSize: 12, color: kMuted)),
                const Spacer(),
                Text(fmt, style: const TextStyle(fontSize: 11, color: kMuted)),
              ],
            ),
            const SizedBox(height: 6),
            Row(
              children: [
                Text('$items items', style: const TextStyle(fontSize: 12, color: kMuted)),
                const Spacer(),
                Text(
                  'LKR ${NumberFormat('#,##0').format(value)}',
                  style: const TextStyle(fontFamily: 'monospace', fontSize: 13, fontWeight: FontWeight.w700, color: kGold),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
