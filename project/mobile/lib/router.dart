import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'models/hairstyle.dart';
import 'providers/auth_provider.dart';
import 'screens/auth/login_screen.dart';
import 'screens/auth/register_screen.dart';
import 'screens/auth/forgot_password_screen.dart';
import 'screens/auth/reset_password_screen.dart';
import 'screens/landing/landing_screen.dart';
import 'screens/scan/scan_screen.dart';
import 'screens/results/results_screen.dart';
import 'screens/swap/swap_screen.dart';
import 'screens/pricing/pricing_screen.dart';
import 'screens/catalog/catalog_screen.dart';
import 'screens/checkout/checkout_screen.dart';
import 'screens/checkout/payment_result_screen.dart';
import 'screens/profile/profile_screen.dart';
import 'screens/profile/settings_screen.dart';
import 'screens/salons/salons_screen.dart';

/// Luồng đầy đủ: Landing -> Login/Register -> Scan (tab gốc) -> Results -> Swap/Pricing,
/// cộng thêm Catalog/Profile/Settings/Salons/Checkout/PaymentResult — khớp toàn bộ
/// trang thật bên project/frontend/src/pages, trừ phần Admin (không cần trên mobile).
final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/',
    redirect: (context, state) {
      final loggedIn = ref.read(authProvider).isLoggedIn;
      final loc = state.matchedLocation;
      const publicRoutes = ['/', '/login', '/register', '/forgot-password', '/reset-password'];
      final isPublic = publicRoutes.contains(loc);

      if (!loggedIn && !isPublic) return '/login';
      if (loggedIn && isPublic) return '/scan';
      return null;
    },
    routes: [
      GoRoute(path: '/', builder: (context, state) => const LandingScreen()),
      GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
      GoRoute(path: '/register', builder: (context, state) => const RegisterScreen()),
      GoRoute(path: '/forgot-password', builder: (context, state) => const ForgotPasswordScreen()),
      GoRoute(path: '/reset-password', builder: (context, state) => const ResetPasswordScreen()),

      GoRoute(path: '/scan', builder: (context, state) => const ScanScreen()),
      GoRoute(path: '/results', builder: (context, state) => const ResultsScreen()),
      GoRoute(
        path: '/swap',
        builder: (context, state) => SwapScreen(hairstyle: state.extra as Hairstyle?),
      ),
      GoRoute(path: '/catalog', builder: (context, state) => const CatalogScreen()),

      GoRoute(path: '/pricing', builder: (context, state) => const PricingScreen()),
      GoRoute(
        path: '/checkout',
        builder: (context, state) => CheckoutScreen(plan: (state.extra as String?) ?? 'PRO'),
      ),
      GoRoute(
        path: '/payment-result',
        builder: (context, state) {
          final extra = state.extra as Map<String, dynamic>?;
          return PaymentResultScreen(
            orderCode: extra?['orderCode'] as String?,
            cancelled: extra?['cancelled'] as bool? ?? false,
          );
        },
      ),

      GoRoute(path: '/profile', builder: (context, state) => const ProfileScreen()),
      GoRoute(path: '/settings', builder: (context, state) => const SettingsScreen()),
      GoRoute(path: '/salons', builder: (context, state) => const SalonsScreen()),
    ],
  );
});
