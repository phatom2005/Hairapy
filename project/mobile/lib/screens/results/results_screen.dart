import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../api/api_client.dart';
import '../../models/hairstyle.dart';
import '../../providers/auth_provider.dart';
import '../../theme.dart';

final hairstylesProvider = FutureProvider.autoDispose<List<Hairstyle>>((ref) async {
  final res = await ApiClient.instance.dio.get('/hairstyles');
  return (res.data as List).map((e) => Hairstyle.fromJson(e as Map<String, dynamic>)).toList();
});

class ResultsScreen extends ConsumerWidget {
  const ResultsScreen({super.key});

  // Khớp đúng logic handleTryStyle bên web (Trends/Results):
  // premiumOnly + user không phải Premium/Admin/Tester -> đẩy sang /pricing.
  void _handleTryStyle(BuildContext context, WidgetRef ref, Hairstyle h) {
    final user = ref.read(authProvider).user;
    if (h.premiumOnly && (user == null || !user.isPremium)) {
      context.push('/pricing');
      return;
    }
    context.push('/swap', extra: h);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final stylesAsync = ref.watch(hairstylesProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Kết quả phân tích')),
      body: stylesAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Không tải được danh sách: $e')),
        data: (styles) => ListView(
          padding: const EdgeInsets.all(20),
          children: [
            const Text('Kiểu tóc gợi ý', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
            const SizedBox(height: 12),
            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: styles.length,
              // mainAxisExtent (px cố định) thay childAspectRatio để tránh
              // card cao hơn nội dung thực tế, làm nút "Thử ngay" tràn ra
              // ngoài và bị Clip.antiAlias cắt mất cạnh dưới.
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                mainAxisSpacing: 14,
                crossAxisSpacing: 14,
                mainAxisExtent: 248,
              ),
              itemBuilder: (context, i) {
                final h = styles[i];
                return HairstyleCard(
                  hairstyle: h,
                  onTryNow: () => _handleTryStyle(context, ref, h),
                );
              },
            ),
            const SizedBox(height: 20),
            OutlinedButton(
              onPressed: () => context.push('/catalog'),
              child: const Text('Xem toàn bộ kho kiểu tóc'),
            ),
          ],
        ),
      ),
    );
  }
}

class HairstyleCard extends StatelessWidget {
  final Hairstyle hairstyle;
  final VoidCallback onTryNow;

  const HairstyleCard({super.key, required this.hairstyle, required this.onTryNow});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 16, offset: const Offset(0, 4))],
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Expanded(
            child: Stack(
              fit: StackFit.expand,
              children: [
                CachedNetworkImage(imageUrl: hairstyle.imageUrl, fit: BoxFit.cover),
                if (hairstyle.premiumOnly)
                  Positioned(
                    top: 10, right: 10,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(color: AppColors.pink, borderRadius: BorderRadius.circular(999)),
                      child: const Text('PREMIUM', style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w700)),
                    ),
                  ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(10, 8, 10, 8),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(hairstyle.name, maxLines: 1, overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, height: 1.1)),
                const SizedBox(height: 6),
                SizedBox(
                  height: 30,
                  child: ElevatedButton(
                    onPressed: onTryNow,
                    style: ElevatedButton.styleFrom(
                      padding: EdgeInsets.zero,
                      minimumSize: const Size.fromHeight(30),
                      textStyle: const TextStyle(fontSize: 11.5),
                    ),
                    child: const Text('Thử ngay'),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
