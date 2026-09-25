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
        child: Padding(
          padding: const EdgeInsets.fromLTRB(28, 24, 28, 28),
          child: Column(
            children: [
              const Spacer(),
              Container(
                width: 120,
                height: 120,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: LinearGradient(
                    colors: [AppColors.primary, AppColors.magenta],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
                child: const Icon(Icons.face_retouching_natural, color: Colors.white, size: 52),
              ),
              const SizedBox(height: 28),
              const Text(
                'Hairapy',
                style: TextStyle(fontSize: 34, fontWeight: FontWeight.w700, color: Colors.white, letterSpacing: -0.5),
              ),
              const SizedBox(height: 8),
              const Text(
                'Scan. Style. Smile.',
                style: TextStyle(fontSize: 15, color: Colors.white70, fontWeight: FontWeight.w500),
              ),
              const SizedBox(height: 16),
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
    );
  }
}
