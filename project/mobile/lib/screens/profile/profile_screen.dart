import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../api/api_client.dart';
import '../../models/hairstyle.dart';
import '../../models/scan_record.dart';
import '../../providers/auth_provider.dart';
import '../../providers/saved_styles_provider.dart';
import '../../screens/scan/scan_screen.dart' show usageSummaryProvider;
import '../../theme.dart';
import '../../widgets/app_bottom_nav.dart';

/// So kieu toc yeu thich hien toi da theo chieu ngang trong Ca nhan -- uu
/// tien cai moi nhat (backend da tra ve sap theo createdAt DESC san), xem het
/// thi bung popup (bottom sheet) danh sach day du, khop dung y muon: "hien
/// thi 4 5 theo chieu ngang ... nguoi dung mun xem day du thi pop up".
const int _kSavedPreviewCount = 5;

/// GET /profile/scans — khớp ProfilePage.jsx bên web.
final scanHistoryProvider = FutureProvider.autoDispose<List<ScanRecord>>((ref) async {
  final res = await ApiClient.instance.dio.get('/profile/scans');
  final scans = (res.data as Map<String, dynamic>)['scans'] as List;
  return scans.map((e) => ScanRecord.fromJson(e as Map<String, dynamic>)).toList();
});

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider).user;
    final usageAsync = ref.watch(usageSummaryProvider);
    final savedAsync = ref.watch(savedStylesProvider);
    final scansAsync = ref.watch(scanHistoryProvider);

    if (user == null) {
      // Phòng hờ — router đã chặn route này khi chưa đăng nhập.
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Cá nhân')),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(usageSummaryProvider);
          ref.invalidate(savedStylesProvider);
          ref.invalidate(scanHistoryProvider);
        },
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(22),
                boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 16, offset: const Offset(0, 4))],
              ),
              child: Column(
                children: [
                  Container(
                    width: 72, height: 72,
                    decoration: const BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: LinearGradient(colors: [AppColors.primary, AppColors.magenta]),
                    ),
                    child: const Icon(Icons.person, color: Colors.white, size: 32),
                  ),
                  const SizedBox(height: 10),
                  Text(user.fullName ?? user.email, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 2),
                  Text(user.email, style: const TextStyle(fontSize: 12.5, color: AppColors.muted)),
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    decoration: BoxDecoration(
                      color: user.isPremium ? AppColors.lime : AppColors.canvas,
                      border: user.isPremium ? null : Border.all(color: AppColors.line),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      user.isPremium ? 'Tài khoản Premium' : 'Tài khoản Free',
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            usageAsync.maybeWhen(
              data: (u) => Row(
                children: [
                  Expanded(child: _StatCard(value: u.faceScan.unlimited ? '∞' : '${u.faceScan.used}/${u.faceScan.limit}', label: 'Quét hôm nay')),
                  const SizedBox(width: 12),
                  Expanded(child: _StatCard(value: u.hairSwap.unlimited ? '∞' : '${u.hairSwap.used}/${u.hairSwap.limit}', label: 'Thử tóc hôm nay')),
                ],
              ),
              orElse: () => const SizedBox.shrink(),
            ),
            const SizedBox(height: 20),

            Row(
              children: [
                const Expanded(
                  child: Text('Kiểu tóc đã lưu', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                ),
                savedAsync.maybeWhen(
                  data: (list) => list.length > _kSavedPreviewCount
                      ? TextButton(
                          onPressed: () => _showAllSavedStyles(context, ref, list),
                          child: Text('Xem tất cả (${list.length})', style: const TextStyle(fontSize: 12.5)),
                        )
                      : const SizedBox.shrink(),
                  orElse: () => const SizedBox.shrink(),
                ),
              ],
            ),
            const SizedBox(height: 10),
            savedAsync.when(
              loading: () => const Padding(padding: EdgeInsets.symmetric(vertical: 12), child: Center(child: CircularProgressIndicator())),
              error: (e, _) => const Text('Không tải được danh sách đã lưu', style: TextStyle(color: AppColors.muted, fontSize: 12.5)),
              data: (list) {
                if (list.isEmpty) {
                  return const Text('Chưa lưu kiểu tóc nào. Vào Kho tóc để lưu kiểu bạn thích.',
                      style: TextStyle(color: AppColors.muted, fontSize: 12.5));
                }
                final preview = list.take(_kSavedPreviewCount).toList();
                return SizedBox(
                  height: 118,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: preview.length,
                    separatorBuilder: (_, __) => const SizedBox(width: 10),
                    itemBuilder: (context, i) {
                      final h = preview[i];
                      return GestureDetector(
                        onTap: () => context.push('/swap', extra: h),
                        child: SizedBox(
                          width: 84,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              ClipRRect(
                                borderRadius: BorderRadius.circular(14),
                                child: CachedNetworkImage(imageUrl: h.imageUrl, width: 84, height: 84, fit: BoxFit.cover),
                              ),
                              const SizedBox(height: 4),
                              Text(h.name, maxLines: 1, overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w600)),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                );
              },
            ),
            const SizedBox(height: 20),

            const Text('Lịch sử quét khuôn mặt', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
            const SizedBox(height: 10),
            scansAsync.when(
              loading: () => const Padding(padding: EdgeInsets.symmetric(vertical: 12), child: Center(child: CircularProgressIndicator())),
              error: (e, _) => const Text('Không tải được lịch sử quét', style: TextStyle(color: AppColors.muted, fontSize: 12.5)),
              data: (scans) {
                if (scans.isEmpty) {
                  return const Text('Chưa có lượt quét nào.', style: TextStyle(color: AppColors.muted, fontSize: 12.5));
                }
                return Column(
                  children: scans.take(5).map((s) => Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: AppColors.line),
                        ),
                        child: Row(
                          children: [
                            ClipRRect(
                              borderRadius: BorderRadius.circular(12),
                              child: CachedNetworkImage(imageUrl: s.imageUrl, width: 46, height: 46, fit: BoxFit.cover),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text('Quét khuôn mặt', style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700)),
                                  Text('${_formatScanDate(s.createdAt)} · Dáng ${s.faceShape}',
                                      style: const TextStyle(fontSize: 11.5, color: AppColors.muted)),
                                ],
                              ),
                            ),
                            // Backend hien chua tra ve trang thai that (thanh
                            // cong/da hoan) cho tung lan quet -- 1 record duoc
                            // luu la 1 lan phan tich thanh cong, nen gan nhan
                            // co dinh "Thanh cong" khop ngu nghia du lieu that.
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                              decoration: BoxDecoration(color: AppColors.lime, borderRadius: BorderRadius.circular(999)),
                              child: const Text('Thành công', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: AppColors.ink)),
                            ),
                          ],
                        ),
                      )).toList(),
                );
              },
            ),
            const SizedBox(height: 24),

            _MenuTile(icon: Icons.settings_outlined, label: 'Cài đặt tài khoản', onTap: () => context.push('/settings')),
            _MenuTile(icon: Icons.workspace_premium_outlined, label: user.isPremium ? 'Quản lý gói Premium' : 'Nâng cấp Premium', onTap: () => context.push('/pricing')),
            _MenuTile(icon: Icons.storefront_outlined, label: 'Salon đối tác', onTap: () => context.push('/salons')),
            const SizedBox(height: 8),
            OutlinedButton(
              style: OutlinedButton.styleFrom(foregroundColor: AppColors.magenta),
              onPressed: () async {
                await ref.read(authProvider.notifier).logout();
                if (context.mounted) context.go('/login');
              },
              child: const Text('Đăng xuất'),
            ),
          ],
        ),
      ),
      bottomNavigationBar: const AppBottomNav(currentIndex: 3),
    );
  }
}

/// Format ngay/gio 1 ban ghi lich su -- "Hom nay, HH:mm", "Hom qua, HH:mm",
/// hoac "dd/mm/yyyy" neu qua 1 ngay, khop cach hien thi trong thiet ke goc
/// (History.dc.html).
String _formatScanDate(DateTime dt) {
  final now = DateTime.now();
  final today = DateTime(now.year, now.month, now.day);
  final target = DateTime(dt.year, dt.month, dt.day);
  final diffDays = today.difference(target).inDays;
  final hm = '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';

  if (diffDays == 0) return 'Hôm nay, $hm';
  if (diffDays == 1) return 'Hôm qua, $hm';
  return '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}/${dt.year}, $hm';
}

/// Bottom sheet hien toan bo kieu toc da luu -- khop thiet ke Favorites.dc.html
/// cu (card anh + ten + nut tim de bo luu ngay tai day), thay vi bat nguoi
/// dung phai qua lai Kho toc moi bo luu duoc.
void _showAllSavedStyles(BuildContext context, WidgetRef ref, List<Hairstyle> list) {
  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.white,
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
    builder: (sheetContext) {
      return DraggableScrollableSheet(
        initialChildSize: 0.7,
        minChildSize: 0.4,
        maxChildSize: 0.92,
        expand: false,
        builder: (context, scrollController) {
          return Consumer(
            builder: (context, sheetRef, _) {
              final savedAsync = sheetRef.watch(savedStylesProvider);
              return Column(
                children: [
                  const Padding(
                    padding: EdgeInsets.fromLTRB(20, 16, 20, 8),
                    child: Row(
                      children: [
                        Expanded(child: Text('Yêu thích', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700))),
                      ],
                    ),
                  ),
                  const Divider(height: 1),
                  Expanded(
                    child: savedAsync.when(
                      loading: () => const Center(child: CircularProgressIndicator()),
                      error: (e, _) => const Center(child: Text('Không tải được danh sách đã lưu')),
                      data: (fullList) {
                        if (fullList.isEmpty) {
                          return const Center(child: Text('Chưa lưu kiểu tóc nào.', style: TextStyle(color: AppColors.muted)));
                        }
                        return ListView.separated(
                          controller: scrollController,
                          padding: const EdgeInsets.all(16),
                          itemCount: fullList.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 12),
                          itemBuilder: (context, i) {
                            final h = fullList[i];
                            return GestureDetector(
                              onTap: () {
                                Navigator.of(sheetContext).pop();
                                context.push('/swap', extra: h);
                              },
                              child: Container(
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(18),
                                  boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 12, offset: const Offset(0, 3))],
                                ),
                                child: Row(
                                  children: [
                                    ClipRRect(
                                      borderRadius: BorderRadius.circular(12),
                                      child: CachedNetworkImage(imageUrl: h.imageUrl, width: 60, height: 60, fit: BoxFit.cover),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(h.name, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                                          if (h.premiumOnly)
                                            const Padding(
                                              padding: EdgeInsets.only(top: 3),
                                              child: Text('PREMIUM', style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w700, color: AppColors.magenta)),
                                            ),
                                        ],
                                      ),
                                    ),
                                    IconButton(
                                      icon: const Icon(Icons.favorite, color: AppColors.magenta),
                                      onPressed: () async {
                                        await sheetRef.read(savedStylesControllerProvider).toggle(h.id, true);
                                      },
                                    ),
                                  ],
                                ),
                              ),
                            );
                          },
                        );
                      },
                    ),
                  ),
                ],
              );
            },
          );
        },
      );
    },
  );
}

class _StatCard extends StatelessWidget {
  final String value;
  final String label;
  const _StatCard({required this.value, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.line)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(value, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
          Text(label, style: const TextStyle(fontSize: 11, color: AppColors.muted)),
        ],
      ),
    );
  }
}

class _MenuTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  const _MenuTile({required this.icon, required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: AppColors.line)),
      child: ListTile(
        leading: Icon(icon, color: AppColors.mauve),
        title: Text(label, style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600)),
        trailing: const Icon(Icons.chevron_right, size: 20, color: AppColors.muted),
        onTap: onTap,
      ),
    );
  }
}
