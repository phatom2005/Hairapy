import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../theme.dart';

/// Thanh điều hướng dưới dùng chung cho 3 màn gốc: Quét, Kho tóc, Cá nhân.
/// Khớp 3 API thật đang có (scan, hairstyles/saved-styles, auth/me) — không thêm
/// tab "Trang chủ"/"Yêu thích" riêng vì backend chưa có endpoint tương ứng, Yêu thích
/// hiện nằm lồng trong Kho tóc (nút tim) và Cá nhân (mục "Kiểu tóc đã lưu").
class AppBottomNav extends StatelessWidget {
  final int currentIndex;
  const AppBottomNav({super.key, required this.currentIndex});

  static const _routes = ['/scan', '/catalog', '/profile'];

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
        NavigationDestination(icon: Icon(Icons.face_retouching_natural_outlined), selectedIcon: Icon(Icons.face_retouching_natural), label: 'Quét'),
        NavigationDestination(icon: Icon(Icons.grid_view_outlined), selectedIcon: Icon(Icons.grid_view), label: 'Kho tóc'),
        NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: 'Cá nhân'),
      ],
    );
  }
}
