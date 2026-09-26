import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../providers/auth_provider.dart';
import '../../screens/scan/scan_screen.dart' show usageSummaryProvider;
import '../../theme.dart';
import '../../widgets/app_bottom_nav.dart';

/// Man Trang chu -- dua theo mockup Home.dc.html (thiet ke cu trong
/// Claude-Design, chua tung duoc code that o ca web lan mobile). Web hien
/// khong co dashboard rieng cho user da dang nhap (redirect thang /scan),
/// nhung ben mobile lam them man nay theo yeu cau rieng cua nguoi dung de
/// lam diem vao trung tam: quota nhanh, loi tat Kho toc, upsell Premium.
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider).user;
    final usageAsync = ref.watch(usageSummaryProvider);

    final userName = user?.fullName ?? user?.email.split('@').first ?? 'bạn';
    final isPremium = user?.isPremium ?? false;

    return Scaffold(
      backgroundColor: AppColors.canvas,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async => ref.invalidate(usageSummaryProvider),
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
            children: [
              Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: const BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: LinearGradient(colors: [AppColors.primary, AppColors.magenta]),
                    ),
                    child: const Icon(Icons.person, color: Colors.white, size: 22),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Chào, $userName', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                        Text(isPremium ? 'Tài khoản Premium' : 'Tài khoản Free',
                            style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: AppColors.muted)),
                      ],
                    ),
                  ),
                  IconButton.filled(
                    style: IconButton.styleFrom(backgroundColor: Colors.white, foregroundColor: AppColors.ink),
                    icon: const Icon(Icons.person_outline),
                    onPressed: () => context.push('/profile'),
                  ),
                ],
              ),
              const SizedBox(height: 18),

              // Card CTA chinh -- quet khuon mat, hien quota con lai neu co.
              InkWell(
                borderRadius: BorderRadius.circular(24),
                onTap: () => context.go('/scan'),
                child: Container(
                  padding: const EdgeInsets.all(22),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(24),
                    gradient: const LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [AppColors.primary, Color(0xFF1039DA)],
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Quét khuôn mặt ngay',
                          style: TextStyle(color: Colors.white, fontSize: 19, fontWeight: FontWeight.w700)),
                      const SizedBox(height: 4),
                      Text(
                        usageAsync.maybeWhen(
                          data: (u) => u.faceScan.unlimited
                              ? 'Không giới hạn lượt quét hôm nay'
                              : 'Còn ${u.faceScan.limit - u.faceScan.used}/${u.faceScan.limit} lượt quét hôm nay',
                          orElse: () => 'Đang tải quota...',
                        ),
                        style: const TextStyle(color: Colors.white70, fontSize: 13),
                      ),
                      const SizedBox(height: 14),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
                        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(999)),
                        child: const Text('Bắt đầu',
                            style: TextStyle(color: Color(0xFF1039DA), fontSize: 13, fontWeight: FontWeight.w700)),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 14),

              // 2 stat card -- quota quet / thu toc hom nay.
              usageAsync.maybeWhen(
                data: (u) => Row(
                  children: [
                    Expanded(
                        child: _StatCard(
                            value: u.faceScan.unlimited ? '∞' : '${u.faceScan.used}/${u.faceScan.limit}',
                            label: 'Lượt quét hôm nay')),
                    const SizedBox(width: 12),
                    Expanded(
                        child: _StatCard(
                            value: u.hairSwap.unlimited ? '∞' : '${u.hairSwap.used}/${u.hairSwap.limit}',
                            label: 'Lượt thử tóc hôm nay')),
                  ],
                ),
                orElse: () => const SizedBox.shrink(),
              ),
              const SizedBox(height: 14),

              _QuickLinkCard(
                gradient: const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [Color(0xFFDCBFCD), AppColors.magenta],
                ),
                icon: Icons.grid_view_rounded,
                title: 'Kho kiểu tóc',
                subtitle: 'Hơn 40 kiểu tóc theo dáng mặt',
                onTap: () => context.go('/catalog'),
              ),
              const SizedBox(height: 12),

              // AI Stylist -- tinh nang trong thiet ke goc nhung chua duoc
              // xay dung that (can them backend goi LLM). Hien thi dung UI
              // nhung gan nhan "Sap ra mat" va khong dieu huong di dau, tranh
              // hua hen 1 tinh nang chua ton tai.
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
                        decoration: BoxDecoration(color: AppColors.lime.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(14)),
                        child: const Icon(Icons.auto_awesome, color: AppColors.lime),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                const Text('AI Stylist', style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w700)),
                                const SizedBox(width: 6),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                                  decoration: BoxDecoration(color: AppColors.lime, borderRadius: BorderRadius.circular(999)),
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
              const SizedBox(height: 14),

              if (!isPremium)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.line),
                  ),
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
            ],
          ),
        ),
      ),
      bottomNavigationBar: const AppBottomNav(currentIndex: 0),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String value;
  final String label;
  const _StatCard({required this.value, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(18), border: Border.all(color: AppColors.line)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(value, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
          Text(label, style: const TextStyle(fontSize: 11.5, color: AppColors.muted)),
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
      borderRadius: BorderRadius.circular(18),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(18), border: Border.all(color: AppColors.line)),
        child: Row(
          children: [
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(gradient: gradient, borderRadius: BorderRadius.circular(14)),
              child: Icon(icon, color: Colors.white),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                  Text(subtitle, style: const TextStyle(fontSize: 11.5, color: AppColors.muted)),
                ],
              ),
            ),
            const Icon(Icons.chevron_right, color: AppColors.muted),
          ],
        ),
      ),
    );
  }
}
