import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../config/feature_flags.dart';
import '../../providers/auth_provider.dart';
import '../../screens/scan/scan_screen.dart' show usageSummaryProvider;
import '../../theme.dart';
import '../../widgets/app_bottom_nav.dart';

/// Màn Trang chủ -- điểm vào trung tâm của app: CTA quét mặt, quota trong ngày,
/// lối tắt Kho kiểu tóc / Salon và mẹo chụp ảnh. Web không có dashboard riêng cho user
/// đã đăng nhập (redirect thẳng /scan) nên màn này chỉ có ở mobile.
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider).user;
    final usageAsync = ref.watch(usageSummaryProvider);

    final userName = user?.fullName ?? user?.email.split('@').first ?? 'bạn';
    final isPremium = user?.isPremium ?? false;
    final trimmedName = userName.trim();
    final initial = trimmedName.isEmpty ? 'H' : String.fromCharCode(trimmedName.runes.first).toUpperCase();

    return Scaffold(
      backgroundColor: AppColors.canvas,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async => ref.invalidate(usageSummaryProvider),
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
            children: [
              // ===== Header: avatar chữ cái đầu + lời chào + nút hồ sơ =====
              Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: const LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [AppColors.primary, AppColors.magenta],
                      ),
                      boxShadow: AppShadows.glow(AppColors.primary),
                    ),
                    child: Text(initial, style: AppFonts.display(fontSize: 18, color: Colors.white)),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Xin chào 👋',
                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.muted)),
                        Text(userName,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: AppFonts.display(fontSize: 16)),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: isPremium ? AppColors.lime : Colors.white,
                      borderRadius: BorderRadius.circular(999),
                      border: Border.all(color: isPremium ? AppColors.lime : AppColors.line),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(isPremium ? Icons.workspace_premium_rounded : Icons.person_outline,
                            size: 14, color: AppColors.ink),
                        const SizedBox(width: 4),
                        Text(isPremium ? 'Premium' : 'Free',
                            style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: AppColors.ink)),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  Material(
                    color: Colors.white,
                    shape: const CircleBorder(),
                    elevation: 2,
                    shadowColor: Colors.black26,
                    child: IconButton(
                      icon: const Icon(Icons.person_outline, color: AppColors.ink),
                      onPressed: () => context.push('/profile'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // ===== Hero CTA: quét khuôn mặt =====
              _HeroScanCard(
                subtitle: usageAsync.maybeWhen(
                  data: (u) => u.faceScan.unlimited
                      ? 'Không giới hạn lượt quét hôm nay'
                      : 'Còn ${u.faceScan.limit - u.faceScan.used}/${u.faceScan.limit} lượt quét hôm nay',
                  orElse: () => 'Đang tải số lượt còn lại...',
                ),
                onTap: () => context.go('/scan'),
              ),
              const SizedBox(height: 16),

              // ===== 2 thẻ quota =====
              usageAsync.maybeWhen(
                data: (u) => Row(
                  children: [
                    Expanded(
                      child: _StatCard(
                        icon: Icons.face_retouching_natural,
                        color: AppColors.primary,
                        value: u.faceScan.unlimited ? '∞' : '${u.faceScan.used}/${u.faceScan.limit}',
                        label: 'Lượt quét hôm nay',
                        progress: u.faceScan.unlimited || u.faceScan.limit <= 0
                            ? null
                            : (u.faceScan.used / u.faceScan.limit).clamp(0.0, 1.0),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _StatCard(
                        icon: Icons.auto_fix_high_rounded,
                        color: AppColors.magenta,
                        value: u.hairSwap.unlimited ? '∞' : '${u.hairSwap.used}/${u.hairSwap.limit}',
                        label: 'Lượt thử tóc hôm nay',
                        progress: u.hairSwap.unlimited || u.hairSwap.limit <= 0
                            ? null
                            : (u.hairSwap.used / u.hairSwap.limit).clamp(0.0, 1.0),
                      ),
                    ),
                  ],
                ),
                orElse: () => const SizedBox.shrink(),
              ),
              const SizedBox(height: 22),

              // ===== Khám phá =====
              Text('Khám phá', style: AppFonts.display(fontSize: 15)),
              const SizedBox(height: 12),
              _QuickLinkCard(
                gradient: const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [AppColors.pink, AppColors.magenta],
                ),
                icon: Icons.grid_view_rounded,
                title: 'Kho kiểu tóc',
                subtitle: 'Hơn 40 kiểu tóc theo dáng mặt',
                onTap: () => context.go('/catalog'),
              ),
              const SizedBox(height: 12),
              _QuickLinkCard(
                gradient: const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [AppColors.primary, AppColors.brand],
                ),
                icon: Icons.storefront_rounded,
                title: 'Salon đối tác',
                subtitle: 'Mang kiểu tóc đã chọn đến đúng nơi thực hiện',
                onTap: () => context.push('/salons'),
              ),
              const SizedBox(height: 12),

              if (kShowAiStylistPlaceholder) ...[
                // AI Stylist -- chưa xây dựng thật (cần backend gọi LLM). Chỉ hiện khi bật cờ,
                // gắn nhãn "Sắp ra mắt" và không điều hướng đi đâu.
                InkWell(
                  borderRadius: BorderRadius.circular(18),
                  onTap: () => ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('AI Stylist đang được phát triển, sẽ sớm ra mắt!')),
                  ),
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(color: AppColors.ink, borderRadius: BorderRadius.circular(18)),
                    child: Row(
                      children: [
                        Container(
                          width: 52,
                          height: 52,
                          decoration: BoxDecoration(
                              color: AppColors.lime.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(14)),
                          child: const Icon(Icons.auto_awesome, color: AppColors.lime),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  const Text('AI Stylist',
                                      style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w700)),
                                  const SizedBox(width: 6),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                                    decoration:
                                        BoxDecoration(color: AppColors.lime, borderRadius: BorderRadius.circular(999)),
                                    child: const Text('SẮP RA MẮT',
                                        style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: AppColors.ink)),
                                  ),
                                ],
                              ),
                              const Text('Tư vấn kiểu tóc cá nhân hoá cùng AI',
                                  style: TextStyle(color: Colors.white60, fontSize: 11.5)),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 12),
              ],

              if (!isPremium && kEnableExternalPayment)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  decoration: AppDecor.card(radius: 16),
                  child: Row(
                    children: [
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Nâng cấp Premium', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                            SizedBox(height: 2),
                            Text('HD không watermark, nhiều lượt hơn mỗi ngày',
                                style: TextStyle(fontSize: 11.5, color: AppColors.muted)),
                          ],
                        ),
                      ),
                      OutlinedButton(
                        style: OutlinedButton.styleFrom(foregroundColor: AppColors.magenta),
                        onPressed: () => context.push('/pricing'),
                        child: const Text('Xem gói'),
                      ),
                    ],
                  ),
                ),
              if (!isPremium && kEnableExternalPayment) const SizedBox(height: 12),

              // ===== Mẹo chụp ảnh =====
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.lime.withValues(alpha: 0.35),
                  borderRadius: BorderRadius.circular(18),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: const BoxDecoration(color: AppColors.lime, shape: BoxShape.circle),
                      child: const Icon(Icons.tips_and_updates_rounded, size: 20, color: AppColors.ink),
                    ),
                    const SizedBox(width: 12),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Mẹo để AI phân tích chính xác',
                              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.ink)),
                          SizedBox(height: 4),
                          Text(
                            'Chụp chính diện, đủ sáng, rõ nét; vén tóc mái và không đeo kính râm hay khẩu trang.',
                            style: TextStyle(fontSize: 12, height: 1.4, color: AppColors.mauve),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
      bottomNavigationBar: const AppBottomNav(currentIndex: 0),
    );
  }
}

/// Card hero "Quét khuôn mặt ngay": gradient thương hiệu, vòng tròn trang trí và bóng màu.
class _HeroScanCard extends StatelessWidget {
  final String subtitle;
  final VoidCallback onTap;
  const _HeroScanCard({required this.subtitle, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(28),
          gradient: const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [AppColors.primary, AppColors.brand, Color(0xFF6A1FB5)],
          ),
          boxShadow: AppShadows.glow(AppColors.primary),
        ),
        child: Stack(
          children: [
            // Vòng tròn trang trí
            Positioned(
              right: -30,
              top: -30,
              child: Container(
                width: 130,
                height: 130,
                decoration: BoxDecoration(shape: BoxShape.circle, color: Colors.white.withValues(alpha: 0.08)),
              ),
            ),
            Positioned(
              right: 36,
              bottom: -44,
              child: Container(
                width: 100,
                height: 100,
                decoration: BoxDecoration(shape: BoxShape.circle, color: AppColors.pink.withValues(alpha: 0.18)),
              ),
            ),
            Positioned(
              right: 20,
              top: 24,
              child: Icon(Icons.face_retouching_natural, size: 64, color: Colors.white.withValues(alpha: 0.28)),
            ),
            Padding(
              padding: const EdgeInsets.all(22),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.18),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: const Text('Scan. Style. Smile.',
                        style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700)),
                  ),
                  const SizedBox(height: 14),
                  Text('Quét khuôn mặt\nngay', style: AppFonts.display(fontSize: 21, color: Colors.white)),
                  const SizedBox(height: 6),
                  Text(subtitle, style: const TextStyle(color: Colors.white70, fontSize: 13)),
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 11),
                    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(999)),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text('Bắt đầu',
                            style: TextStyle(color: AppColors.brand, fontSize: 13.5, fontWeight: FontWeight.w700)),
                        SizedBox(width: 6),
                        Icon(Icons.arrow_forward_rounded, size: 16, color: AppColors.brand),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String value;
  final String label;
  // null = không giới hạn (không vẽ thanh tiến độ)
  final double? progress;

  const _StatCard({
    required this.icon,
    required this.color,
    required this.value,
    required this.label,
    required this.progress,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: AppDecor.card(radius: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(color: color.withValues(alpha: 0.12), shape: BoxShape.circle),
                child: Icon(icon, size: 17, color: color),
              ),
              const Spacer(),
              Text(value, style: AppFonts.display(fontSize: 17)),
            ],
          ),
          const SizedBox(height: 12),
          if (progress != null) ...[
            ClipRRect(
              borderRadius: BorderRadius.circular(999),
              child: LinearProgressIndicator(
                value: progress,
                minHeight: 6,
                backgroundColor: color.withValues(alpha: 0.12),
                valueColor: AlwaysStoppedAnimation<Color>(color),
              ),
            ),
            const SizedBox(height: 8),
          ],
          Text(label, style: const TextStyle(fontSize: 11.5, color: AppColors.muted, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}

class _QuickLinkCard extends StatelessWidget {
  final Gradient gradient;
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  const _QuickLinkCard({
    required this.gradient,
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(20),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: AppDecor.card(radius: 20),
        child: Row(
          children: [
            Container(
              width: 54,
              height: 54,
              decoration: BoxDecoration(gradient: gradient, borderRadius: BorderRadius.circular(16)),
              child: Icon(icon, color: Colors.white),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 2),
                  Text(subtitle, style: const TextStyle(fontSize: 11.5, color: AppColors.muted)),
                ],
              ),
            ),
            const Icon(Icons.chevron_right_rounded, color: AppColors.muted),
          ],
        ),
      ),
    );
  }
}
