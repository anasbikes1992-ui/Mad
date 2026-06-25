import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../shared/theme.dart';
import '../../shared/widgets/status_badge.dart';
import '../../shared/services/supabase_service.dart';

const _statuses = ['ALL', 'PENDING_APPROVAL', 'APPROVED', 'IN_TRANSIT', 'RECEIVED', 'DRAFT'];

final transferListProvider = FutureProvider.family<List<Map<String, dynamic>>, String>((ref, status) async {
  return StockService.getTransfers(status: status == 'ALL' ? null : status);
});

class TransferListScreen extends ConsumerStatefulWidget {
  const TransferListScreen({super.key});

  @override
  ConsumerState<TransferListScreen> createState() => _TransferListScreenState();
}

class _TransferListScreenState extends ConsumerState<TransferListScreen> {
  String _activeStatus = 'ALL';

  @override
  Widget build(BuildContext context) {
    final transfersAsync = ref.watch(transferListProvider(_activeStatus));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Transfers'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_rounded),
            color: kGold,
            onPressed: () => context.go('/transfers/new'),
          ),
        ],
      ),
      body: Column(
        children: [
          // Status filter chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              children: _statuses.map((s) {
                final selected = s == _activeStatus;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: FilterChip(
                    label: Text(s == 'ALL' ? 'All' : s.replaceAll('_', ' ')),
                    selected: selected,
                    onSelected: (_) => setState(() => _activeStatus = s),
                    selectedColor: kGold.withOpacity(0.15),
                    checkmarkColor: kGold,
                  ),
                );
              }).toList(),
            ),
          ),

          // List
          Expanded(
            child: RefreshIndicator(
              color: kGold,
              onRefresh: () => ref.refresh(transferListProvider(_activeStatus).future),
              child: transfersAsync.when(
                loading: () => const Center(child: CircularProgressIndicator(color: kGold)),
                error: (e, _) => Center(child: Text('Error: $e', style: const TextStyle(color: Colors.red))),
                data: (transfers) => transfers.isEmpty
                    ? const Center(child: Text('No transfers found', style: TextStyle(color: kMuted)))
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        itemCount: transfers.length,
                        itemBuilder: (ctx, i) => _TransferCard(
                          transfer: transfers[i],
                          onTap: () => context.go('/transfers/${transfers[i]['id']}'),
                        ),
                      ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _TransferCard extends StatelessWidget {
  final Map<String, dynamic> transfer;
  final VoidCallback onTap;
  const _TransferCard({required this.transfer, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final from  = (transfer['from_location'] as Map<String, dynamic>?)?['name'] ?? '?';
    final to    = (transfer['to_location']   as Map<String, dynamic>?)?['name'] ?? '?';
    final items = (transfer['transfer_items'] as List?)?.length ?? 0;
    final dt    = DateTime.tryParse(transfer['requested_at'] ?? '');
    final fmt   = dt != null ? DateFormat('dd MMM yy').format(dt) : '';

    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  StatusBadge(status: transfer['status'] ?? ''),
                  const Spacer(),
                  Text(fmt, style: const TextStyle(fontSize: 11, color: kMuted)),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(child: Text(from, style: const TextStyle(fontWeight: FontWeight.w600, color: Colors.white, fontSize: 13), maxLines: 1, overflow: TextOverflow.ellipsis)),
                  const Padding(padding: EdgeInsets.symmetric(horizontal: 8), child: Icon(Icons.arrow_forward_rounded, size: 14, color: kMuted)),
                  Expanded(child: Text(to, style: const TextStyle(fontWeight: FontWeight.w600, color: Colors.white, fontSize: 13), maxLines: 1, overflow: TextOverflow.ellipsis, textAlign: TextAlign.right)),
                ],
              ),
              const SizedBox(height: 6),
              Text('$items item${items != 1 ? 's' : ''}', style: const TextStyle(fontSize: 11, color: kMuted)),
            ],
          ),
        ),
      ),
    );
  }
}
