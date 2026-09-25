import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../api/api_client.dart';
import '../../models/salon.dart';
import '../../theme.dart';

/// GET /salons — công khai, không cần đăng nhập (SalonController.java).
final salonsProvider = FutureProvider.autoDispose<List<Salon>>((ref) async {
  final res = await ApiClient.instance.dio.get('/salons');
  return (res.data as List).map((e) => Salon.fromJson(e as Map<String, dynamic>)).toList();
});

class SalonsScreen extends ConsumerWidget {
  const SalonsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final salonsAsync = ref.watch(salonsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Salon đối tác')),
      body: salonsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Không tải được danh sách salon: $e')),
        data: (salons) {
          if (salons.isEmpty) {
            return const Center(child: Text('Chưa có salon đối tác nào.', style: TextStyle(color: AppColors.muted)));
          }
          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: salons.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (context, i) {
              final s = salons[i];
              return Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(18),
                  boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 12, offset: const Offset(0, 3))],
                ),
                clipBehavior: Clip.antiAlias,
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    CachedNetworkImage(imageUrl: s.imageUrl, width: 96, fit: BoxFit.cover),
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Expanded(child: Text(s.name, maxLines: 1, overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700))),
                                if (s.verified)
                                  const Icon(Icons.verified, size: 16, color: AppColors.primary),
                              ],
                            ),
                            const SizedBox(height: 3),
                            Text('${s.district} · ${s.address}', maxLines: 1, overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontSize: 11.5, color: AppColors.muted)),
                            const SizedBox(height: 6),
                            Row(
                              children: [
                                const Icon(Icons.star, size: 14, color: Colors.amber),
                                const SizedBox(width: 3),
                                Text(s.rating.toStringAsFixed(1), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                                const SizedBox(width: 10),
                                Text('Từ ${s.priceFrom ~/ 1000}k', style: const TextStyle(fontSize: 12, color: AppColors.mauve)),
                              ],
                            ),
                            if (s.services.isNotEmpty) ...[
                              const SizedBox(height: 6),
                              Wrap(
                                spacing: 6, runSpacing: 6,
                                children: s.services.take(3).map((t) => Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                      decoration: BoxDecoration(color: AppColors.canvas, borderRadius: BorderRadius.circular(999)),
                                      child: Text(t, style: const TextStyle(fontSize: 10, color: AppColors.mauve)),
                                    )).toList(),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              );
            },
          );
        },
      ),
    );
  }
}
