import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../theme.dart';

/// Thanh dieu huong duoi dung chung cho 4 man goc: Trang chu, Quet, Kho toc,
/// Ca nhan. Yeu thich KHONG lam tab rieng (theo yeu cau: van nam trong Ca
/// nhan, chi hien vai kieu moi nhat + popup xem day du) -- khac voi mockup
/// Home.dc.html cu (co tab Favorites rieng) vi backend/API hien co khop huong
/// nay hon, tranh lam 1 tab rong/trung lap voi Kho toc.
class AppBottomNav extends StatelessWidget {
  final int currentIndex;
  const AppBottomNav({super.key, required this.currentIndex});

  static const _routes = ['/home', '/scan', '/catalog', '/profile'];

  @override
  Widget build(BuildContext context) {
    return NavigationBar(
      selectedIndex: currentIndex,
      backgroundColor: Colors.white,
      indicatorColor: AppColors.primary.withValues(alpha: 0.12),
      onDestinationSelected: (i) {
        if (i == currentIndex) return;
        context.go(_routes[i]);
      },
      destinations: const [
        NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: 'Trang chủ'),
        NavigationDestination(icon: Icon(Icons.face_retouching_natural_outlined), selectedIcon: Icon(Icons.face_retouching_natural), label: 'Quét'),
        NavigationDestination(icon: Icon(Icons.grid_view_outlined), selectedIcon: Icon(Icons.grid_view), label: 'Kho tóc'),
        NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: 'Cá nhân'),
      ],
    );
  }
}
