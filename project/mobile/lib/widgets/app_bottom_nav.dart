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
    // Bóng đổ nhẹ phía trên để thanh điều hướng "nổi" lên khỏi nội dung.
    return DecoratedBox(
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: AppColors.ink.withValues(alpha: 0.07),
            blurRadius: 20,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: NavigationBar(
        selectedIndex: currentIndex,
        onDestinationSelected: (i) {
          if (i == currentIndex) return;
          context.go(_routes[i]);
        },
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home_rounded), label: 'Trang chủ'),
          NavigationDestination(icon: Icon(Icons.face_retouching_natural_outlined), selectedIcon: Icon(Icons.face_retouching_natural), label: 'Quét'),
          NavigationDestination(icon: Icon(Icons.grid_view_outlined), selectedIcon: Icon(Icons.grid_view_rounded), label: 'Kho tóc'),
          NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: 'Cá nhân'),
        ],
      ),
    );
  }
}
