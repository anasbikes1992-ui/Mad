import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../shared/theme.dart';
import '../../shared/services/supabase_service.dart';

class ReceiveTransferScreen extends ConsumerStatefulWidget {
  final String id;
  const ReceiveTransferScreen({super.key, required this.id});

  @override
  ConsumerState<ReceiveTransferScreen> createState() => _ReceiveTransferScreenState();
}

class _ReceiveTransferScreenState extends ConsumerState<ReceiveTransferScreen> {
  Map<String, dynamic>? _transfer;
  final Map<String, TextEditingController> _qtyCtrl = {};
  bool _loading = true;
  bool _saving  = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    for (final c in _qtyCtrl.values) c.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final t = await StockService.getTransfer(widget.id);
    if (!mounted) return;
    setState(() { _transfer = t; _loading = false; });
    if (t != null) {
      for (final item in (t['transfer_items'] as List)) {
        final i = item as Map<String, dynamic>;
        final dispatched = (i['quantity_dispatched'] as num?)?.toDouble() ?? 0;
        _qtyCtrl[i['id'] as String] = TextEditingController(text: dispatched.toStringAsFixed(0));
      }
    }
  }

  Future<void> _confirm() async {
    if (_transfer == null) return;
    setState(() => _saving = true);

    try {
      final items = (_transfer!['transfer_items'] as List).map((item) {
        final i = item as Map<String, dynamic>;
        final id = i['id'] as String;
        return {
          'transfer_item_id': id,
          'quantity_received': double.tryParse(_qtyCtrl[id]?.text ?? '0') ?? 0,
        };
      }).toList();

      final res = await Supabase.instance.client.functions.invoke(
        'transfers-receive',
        body: {'transfer_id': widget.id, 'items': items},
      );

      if (res.status != 200) throw Exception(res.data['error'] ?? 'Failed');

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Transfer received successfully'), backgroundColor: Color(0xFF10B981)),
        );
        context.go('/transfers');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator(color: kGold)));
    }

    final items = (_transfer?['transfer_items'] as List?) ?? [];

    return Scaffold(
      appBar: AppBar(title: const Text('Receive Transfer')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Route summary
          Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Row(
                children: [
                  Expanded(child: Text((_transfer?['from_location'] as Map?)?['name'] ?? '?',
                    style: const TextStyle(fontWeight: FontWeight.w600, color: Colors.white, fontSize: 13))),
                  const Icon(Icons.arrow_forward_rounded, size: 14, color: kMuted),
                  Expanded(child: Text((_transfer?['to_location'] as Map?)?['name'] ?? '?',
                    style: const TextStyle(fontWeight: FontWeight.w600, color: Colors.white, fontSize: 13), textAlign: TextAlign.right)),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          const Text('Enter Received Quantities', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Colors.white)),
          const SizedBox(height: 10),
          ...items.map((item) {
            final i = item as Map<String, dynamic>;
            final id = i['id'] as String;
            final variant = i['variant'] as Map<String, dynamic>?;
            final dispatched = (i['quantity_dispatched'] as num?)?.toInt() ?? 0;
            return Card(
              margin: const EdgeInsets.only(bottom: 10),
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(variant?['item_code'] ?? '—', style: const TextStyle(fontFamily: 'monospace', fontSize: 11, color: kGold)),
                          Text(variant?['name'] ?? '', style: const TextStyle(fontSize: 13, color: Colors.white)),
                          Text('Dispatched: $dispatched ${i['unit']}', style: const TextStyle(fontSize: 11, color: kMuted)),
                        ],
                      ),
                    ),
                    SizedBox(
                      width: 80,
                      child: TextField(
                        controller: _qtyCtrl[id],
                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        textAlign: TextAlign.right,
                        style: const TextStyle(fontFamily: 'monospace', fontSize: 16, fontWeight: FontWeight.w700),
                        decoration: const InputDecoration(
                          contentPadding: EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                          isDense: true,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            );
          }),
          const SizedBox(height: 20),
          ElevatedButton(
            onPressed: _saving ? null : _confirm,
            child: _saving
                ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: kNavy))
                : const Text('Confirm Receipt'),
          ),
        ],
      ),
    );
  }
}
