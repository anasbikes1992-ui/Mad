import 'package:supabase_flutter/supabase_flutter.dart';

final supabase = Supabase.instance.client;

class StockService {
  static Future<List<Map<String, dynamic>>> searchVariants(String query, {String? locationId}) async {
    final req = supabase
        .from('product_variants')
        .select('''
          id, item_code, name, color, color_hex, unit, cost_price, barcode,
          product:products(name, category:categories(name)),
          stock_balances!inner(quantity_available, location_id, location:locations(name))
        ''')
        .eq('is_active', true)
        .or('item_code.ilike.%$query%,name.ilike.%$query%,barcode.eq.$query')
        .limit(20);

    if (locationId != null) {
      req.eq('stock_balances.location_id', locationId);
    }

    final res = await req;
    return List<Map<String, dynamic>>.from(res);
  }

  static Future<List<Map<String, dynamic>>> getTransfers({
    String? status,
    String? locationId,
  }) async {
    var req = supabase
        .from('transfers')
        .select('''
          id, status, approval_required, requested_at,
          from_location:locations!from_location_id(name),
          to_location:locations!to_location_id(name),
          transfer_items(quantity_requested, variant:product_variants(item_code, name))
        ''')
        .order('requested_at', ascending: false)
        .limit(50);

    if (status != null)     req = req.eq('status', status);
    if (locationId != null) req = req.or('from_location_id.eq.$locationId,to_location_id.eq.$locationId');

    final res = await req;
    return List<Map<String, dynamic>>.from(res);
  }

  static Future<Map<String, dynamic>?> getTransfer(String id) async {
    final res = await supabase
        .from('transfers')
        .select('''
          *,
          from_location:locations!from_location_id(*),
          to_location:locations!to_location_id(*),
          transfer_items(
            id, quantity_requested, quantity_dispatched, quantity_received, unit,
            variant:product_variants(id, item_code, name, color, unit)
          )
        ''')
        .eq('id', id)
        .single();
    return res;
  }

  static Future<List<Map<String, dynamic>>> getLocations() async {
    final res = await supabase
        .from('locations')
        .select('id, name, type')
        .eq('is_active', true)
        .order('name');
    return List<Map<String, dynamic>>.from(res);
  }
}
