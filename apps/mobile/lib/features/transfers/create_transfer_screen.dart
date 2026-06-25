import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../shared/theme.dart';
import '../../shared/services/supabase_service.dart';

class CreateTransferScreen extends ConsumerStatefulWidget {
  const CreateTransferScreen({super.key});

  @override
  ConsumerState<CreateTransferScreen> createState() => _CreateTransferScreenState();
}

class _CreateTransferScreenState extends ConsumerState<CreateTransferScreen> {
  List<Map<String, dynamic>> _locations = [];
  String? _fromId, _toId;
  final _searchCtrl = TextEditingController();
  List<Map<String, dynamic>> _searchResults = [];
  final List<Map<String, dynamic>> _items = [];
  final _notesCtrl = TextEditingController();
  bool _loading = false;
  bool _saving  = false;

  @override
  void initState() {
    super.initState();
    _loadLocations();
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadLocations() async {
    final locs = await StockService.getLocations();
    if (mounted) setState(() => _locations = locs);
  }

  Future<void> _search(String q) async {
    if (q.length < 2) { setState(() => _searchResults = []); return; }
    setState(() => _loading = true);
    final res = await StockService.searchVariants(q, locationId: _fromId);
    if (mounted) setState(() { _searchResults = res; _loading = false; });
  }

  void _addItem(Map<String, dynamic> variant) {
    if (_items.any((i) => i['variant_id'] == variant['id'])) return;
    final balances = variant['stock_balances'] as List? ?? [];
    final avail = _fromId != null
        ? (balances.firstWhere((b) => (b as Map)['location_id'] == _fromId, orElse: () => {'quantity_available': 0}) as Map)['quantity_available']
        : 0;
    setState(() {
      _items.add({
        'variant_id': variant['id'],
        'item_code':  variant['item_code'],
        'name':       variant['name'],
        'unit':       variant['unit'],
        'available':  avail,
        'quantity':   1.0,
      });
      _searchCtrl.clear();
      _searchResults = [];
    });
  }

  Future<void> _submit(bool asDraft) async {
    if (_fromId == null || _toId == null) { _snack('Select both locations'); return; }
    if (_fromId == _toId) { _snack('From and To cannot be the same'); return; }
    if (_items.isEmpty) { _snack('Add at least one item'); return; }

    setState(() => _saving = true);
    try {
      final client = Supabase.instance.client;

      final transfer = await client.from('transfers').insert({
        'from_location_id': _fromId,
        'to_location_id':   _toId,
        'notes':            _notesCtrl.text.isEmpty ? null : _notesCtrl.text,
        'status':           'DRAFT',
      }).select().single();

      final transferId = transfer['id'] as String;

      await client.from('transfer_items').insert(_items.map((item) => {
        'transfer_id':        transferId,
        'variant_id':         item['variant_id'],
        'quantity_requested': item['quantity'],
        'unit':               item['unit'],
      }).toList());

      if (!asDraft) {
        await client.from('transfers').update({'status': 'PENDING_APPROVAL'}).eq('id', transferId);
      }

      if (mounted) {
        _snack(asDraft ? 'Saved as draft' : 'Transfer submitted', success: true);
        context.go('/transfers');
      }
    } catch (e) {
      if (mounted) _snack('Error: $e');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  void _snack(String msg, {bool success = false}) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(msg),
      backgroundColor: success ? const Color(0xFF10B981) : Colors.red,
    ));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('New Transfer')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Location dropdowns
          _buildLocationSelect('From', _fromId, (v) => setState(() { _fromId = v; _items.clear(); })),
          const SizedBox(height: 10),
          _buildLocationSelect('To',   _toId,   (v) => setState(() => _toId   = v)),
          const SizedBox(height: 16),

          // Item search
          TextField(
            controller: _searchCtrl,
            onChanged: _search,
            decoration: const InputDecoration(
              hintText: 'Search item code or name to add…',
              prefixIcon: Icon(Icons.search, size: 18, color: kMuted),
            ),
          ),
          if (_loading) const Padding(padding: EdgeInsets.all(8), child: LinearProgressIndicator(color: kGold)),
          if (_searchResults.isNotEmpty)
            Container(
              margin: const EdgeInsets.only(top: 4),
              decoration: BoxDecoration(color: kNavy2, borderRadius: BorderRadius.circular(10), border: Border.all(color: kBorder)),
              child: Column(
                children: _searchResults.take(6).map((v) => ListTile(
                  title: Text(v['name'] ?? '', style: const TextStyle(fontSize: 13, color: Colors.white)),
                  subtitle: Text(v['item_code'] ?? '', style: const TextStyle(fontFamily: 'monospace', fontSize: 11, color: kGold)),
                  trailing: IconButton(icon: const Icon(Icons.add_circle_outline, color: kGold), onPressed: () => _addItem(v)),
                  dense: true,
                )).toList(),
              ),
            ),
          const SizedBox(height: 16),

          // Items list
          if (_items.isNotEmpty) ...[
            const Text('Items', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.white)),
            const SizedBox(height: 8),
            ..._items.map((item) => _ItemRow(
              item: item,
              onRemove: () => setState(() => _items.remove(item)),
              onQtyChange: (q) => setState(() => item['quantity'] = q),
            )),
            const SizedBox(height: 12),
          ],

          // Notes
          TextField(
            controller: _notesCtrl,
            maxLines: 3,
            decoration: const InputDecoration(
              hintText: 'Notes (optional)',
              alignLabelWithHint: true,
            ),
          ),
          const SizedBox(height: 24),

          Row(children: [
            Expanded(
              child: OutlinedButton(
                onPressed: _saving ? null : () => _submit(true),
                style: OutlinedButton.styleFrom(
                  foregroundColor: kMuted, side: const BorderSide(color: kBorder),
                  minimumSize: const Size(0, 46),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                child: const Text('Save Draft'),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              flex: 2,
              child: ElevatedButton(
                onPressed: _saving ? null : () => _submit(false),
                child: _saving
                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: kNavy))
                    : const Text('Submit'),
              ),
            ),
          ]),
        ],
      ),
    );
  }

  Widget _buildLocationSelect(String label, String? value, ValueChanged<String?> onChanged) {
    return DropdownButtonFormField<String>(
      value: value,
      dropdownColor: kNavy2,
      decoration: InputDecoration(labelText: label),
      items: _locations.map((l) => DropdownMenuItem(
        value: l['id'] as String,
        child: Text(l['name'] as String, style: const TextStyle(fontSize: 13)),
      )).toList(),
      onChanged: onChanged,
    );
  }
}

class _ItemRow extends StatelessWidget {
  final Map<String, dynamic> item;
  final VoidCallback onRemove;
  final ValueChanged<double> onQtyChange;
  const _ItemRow({required this.item, required this.onRemove, required this.onQtyChange});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(10),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(item['item_code'] ?? '', style: const TextStyle(fontFamily: 'monospace', fontSize: 11, color: kGold)),
                  Text(item['name'] ?? '', style: const TextStyle(fontSize: 13, color: Colors.white)),
                  Text('Avail: ${item['available']} ${item['unit']}', style: const TextStyle(fontSize: 11, color: kMuted)),
                ],
              ),
            ),
            SizedBox(
              width: 70,
              child: TextFormField(
                initialValue: (item['quantity'] as double).toStringAsFixed(0),
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                textAlign: TextAlign.right,
                style: const TextStyle(fontFamily: 'monospace', fontSize: 15, fontWeight: FontWeight.w700, color: Colors.white),
                decoration: const InputDecoration(isDense: true, contentPadding: EdgeInsets.symmetric(horizontal: 6, vertical: 8)),
                onChanged: (v) => onQtyChange(double.tryParse(v) ?? 1),
              ),
            ),
            IconButton(icon: const Icon(Icons.close, size: 18, color: kMuted), onPressed: onRemove),
          ],
        ),
      ),
    );
  }
}
