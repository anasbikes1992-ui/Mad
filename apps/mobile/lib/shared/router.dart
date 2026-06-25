import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../features/auth/login_screen.dart';
import '../features/dashboard/dashboard_screen.dart';
import '../features/stock_lookup/stock_lookup_screen.dart';
import '../features/transfers/transfer_list_screen.dart';
import '../features/transfers/create_transfer_screen.dart';
import '../features/transfers/receive_transfer_screen.dart';
import '../features/stock_in/stock_in_screen.dart';

final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/dashboard',
    redirect: (context, state) {
      final session = Supabase.instance.client.auth.currentSession;
      final isOnLogin = state.matchedLocation == '/login';
      if (session == null && !isOnLogin) return '/login';
      if (session != null && isOnLogin) return '/dashboard';
      return null;
    },
    routes: [
      GoRoute(path: '/login',     builder: (ctx, _) => const LoginScreen()),
      ShellRoute(
        builder: (ctx, state, child) => MainShell(child: child),
        routes: [
          GoRoute(path: '/dashboard',  builder: (ctx, _) => const DashboardScreen()),
          GoRoute(path: '/stock',      builder: (ctx, _) => const StockLookupScreen()),
          GoRoute(path: '/transfers',  builder: (ctx, _) => const TransferListScreen(),
            routes: [
              GoRoute(path: 'new',          builder: (ctx, _) => const CreateTransferScreen()),
              GoRoute(path: ':id/receive',  builder: (ctx, state) => ReceiveTransferScreen(id: state.pathParameters['id']!)),
            ],
          ),
          GoRoute(path: '/stock-in',   builder: (ctx, _) => const StockInScreen()),
        ],
      ),
    ],
  );
});

class MainShell extends StatefulWidget {
  final Widget child;
  const MainShell({super.key, required this.child});

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  int _index = 0;

  static const _routes = ['/dashboard', '/stock', '/transfers', '/stock-in'];
  static const _labels = ['Home', 'Stock', 'Transfers', 'Stock In'];
  static const _icons  = [Icons.home_outlined, Icons.inventory_2_outlined, Icons.swap_horiz_rounded, Icons.input_rounded];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: widget.child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) {
          setState(() => _index = i);
          context.go(_routes[i]);
        },
        backgroundColor: const Color(0xFF162035),
        indicatorColor: const Color(0xFFC9A84C).withOpacity(0.15),
        destinations: List.generate(_routes.length, (i) => NavigationDestination(
          icon:          Icon(_icons[i]),
          selectedIcon:  Icon(_icons[i], color: const Color(0xFFC9A84C)),
          label:         _labels[i],
        )),
      ),
    );
  }
}
