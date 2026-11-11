import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../theme.dart';

/// Màn giới thiệu trước khi đăng nhập — bản rút gọn của LandingPage.jsx bên web
/// (hero + CTA), vì mobile không cần đầy đủ landing marketing như web.
class LandingScreen extends StatelessWidget {
  const LandingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.ink,
      body: SafeArea(
        // Cuộn được khi màn hình thấp / cửa sổ trình duyệt hẹp (Flutter web), tránh RenderFlex overflow;
        // màn hình bình thường vẫn căn giữa nhờ minHeight = chiều cao khả dụng.
        child: LayoutBuilder(
          builder: (context, constraints) => SingleChildScrollView(
            child: ConstrainedBox(
              constraints: BoxConstraints(minHeight: constraints.maxHeight),
              child: IntrinsicHeight(
                child: Padding(
          padding: const EdgeInsets.fromLTRB(28, 24, 28, 28),
          child: Column(
            children: [
              const Spacer(),
              // Logo Hairapy bản trắng (đã gồm dòng "Scan. Style. Smile.") cho nền tối
              Image.asset(
                'assets/brand/logo_white_stack.png',
                width: 210,
                semanticLabel: 'Hairapy - Scan. Style. Smile.',
              ),
              const SizedBox(height: 24),
              const Text(
                'Phân tích khuôn mặt bằng AI và thử ngay kiểu tóc hợp với bạn\ntrước khi ra tiệm.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 13.5, color: Colors.white54, height: 1.5),
              ),
              const Spacer(),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.lime, foregroundColor: AppColors.ink),
                  onPressed: () => context.go('/login'),
                  child: const Text('Đăng nhập'),
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.white,
                    minimumSize: const Size.fromHeight(52),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
                    side: const BorderSide(color: Colors.white30, width: 1.5),
                  ),
                  onPressed: () => context.go('/register'),
                  child: const Text('Tạo tài khoản mới', style: TextStyle(fontWeight: FontWeight.w700)),
                ),
              ),
            ],
          ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
