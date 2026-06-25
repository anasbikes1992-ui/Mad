import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../../shared/theme.dart';
import '../../shared/services/supabase_service.dart';

class StockLookupScreen extends ConsumerStatefulWidget {
  const StockLookupScreen({super.key});

  @override
  ConsumerState<StockLookupScreen> createState() => _StockLookupScreenState();
}

class _StockLookupScreenState extends ConsumerState<StockLookupScreen> {
  final _searchCtrl = TextEditingController();
  bool _scanning   = false;
  bool _loading    = false;
  List<Map<String, dynamic>> _results = [];

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _search(String q) async {
    if (q.length < 2) { setState(() => _results = []); return; }
    setState(() => _loading = true);
    final res = await StockService.searchVariants(q);
    if (mounted) setState(() { _results = res; _loading = false; });
  }

  void _onBarcodeDetect(BarcodeCapture capture) {
    final code = capture.barcodes.first.rawValue;
    if (code == null) return;
    setState(() { _scanning = false; _searchCtrl.text = code; });
    _search(code);
  }

  @override
  Widget build(BuildContext context) {
    if (_scanning) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Scan Barcode'),
          leading: IconButton(icon: const Icon(Icons.close), onPressed: () => setState(() => _scanning = false)),
        ),
        body: MobileScanner(
          onDetect: _onBarcodeDetect,
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Stock Lookup')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _searchCtrl,
                    onChanged: _search,
                    decoration: const InputDecoration(
                      hintText: 'Search item code, name…',
                      prefixIcon: Icon(Icons.search, size: 18, color: kMuted),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Container(
                  decoration: BoxDecoration(
                    color: kNavy2, borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: kBorder),
                  ),
                  child: IconButton(
                    icon: const Icon(Icons.qr_code_scanner_rounded, color: kGold),
                    onPressed: () => setState(() => _scanning = true),
                  ),
                ),
              ],
            ),
          ),

          if (_loading)
            const Padding(padding: EdgeInsets.all(24), child: CircularProgressIndicator(color: kGold))
          else
            Expanded(
              child: ListView.builder(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: _results.length,
                itemBuilder: (ctx, i) => _VariantCard(variant: _results[i]),
              ),
            ),
        ],
      ),
    );
  }
}

class _VariantCard extends StatelessWidget {
  final Map<String, dynamic> variant;
  const _VariantCard({required this.variant});

  @override
  Widget build(BuildContext context) {
    final balances = variant['stock_balances'] as List? ?? [];
    final product  = variant['product'] as Map<String, dynamic>?;

    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(variant['item_code'] ?? '—', style: const TextStyle(fontFamily: 'monospace', fontSize: 12, color: kGold, fontWeight: FontWeight.w700)),
                const Spacer(),
                Text(product?['name'] ?? '', style: const TextStyle(fontSize: 11, color: kMuted)),
              ],
            ),
            const SizedBox(height: 4),
            Text(variant['name'] ?? '', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Colors.white)),
            if (variant['color'] != null)
              Padding(
                padding: const EdgeInsets.only(top: 2),
                child: Text(variant['color'], style: const TextStyle(fontSize: 12, color: kMuted)),
              ),
            const SizedBox(height: 12),
            const Text('Stock by Location', style: TextStyle(fontSize: 11, color: kMuted, fontWeight: FontWeight.w600)),
            const SizedBox(height: 6),
            ...balances.map((b) {
              final bal = b as Map<String, dynamic>;
              final location  = bal['location'] as Map<String, dynamic>?;
              final available = (bal['quantity_available'] as num).toInt();
              return Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Row(
                  children: [
                    Expanded(child: Text(location?['name'] ?? '—', style: const TextStyle(fontSize: 12, color: Colors.white))),
                    Text(
                      '$available ${variant['unit']}',
                      style: TextStyle(
                        fontFamily: 'monospace', fontSize: 13, fontWeight: FontWeight.w700,
                        color: available > 0 ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                      ),
                    ),
                  ],
                ),
              );
            }),
          ],
        ),
      ),
    );
  }
}
