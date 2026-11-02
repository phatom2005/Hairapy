import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../api/api_client.dart';
import '../models/salon.dart';
import '../theme.dart';
import 'booking_sheet.dart';

/// Salon đối tác nhận làm 1 kiểu tóc — GET /salons?hairstyleId=..&partnerOnly=true.
final partnerSalonsForStyleProvider =
    FutureProvider.autoDispose.family<List<Salon>, int>((ref, hairstyleId) async {
  final res = await ApiClient.instance.dio.get('/salons', queryParameters: {
    'hairstyleId': hairstyleId,
    'partnerOnly': true,
  });
  return (res.data as List).map((e) => Salon.fromJson(e as Map<String, dynamic>)).toList();
});

/// Bottom sheet "Cắt kiểu này ở đâu?" sau khi thử tóc — khớp SalonMatchSheet.jsx bên web.
Future<void> showSalonMatchSheet(
  BuildContext context, {
  required int hairstyleId,
  required String hairstyleName,
  String? tryOnImageUrl,
  String? faceShape,
}) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: AppColors.canvas,
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
    builder: (_) => DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.7,
      minChildSize: 0.4,
      maxChildSize: 0.95,
      builder: (context, scrollCtrl) => _SalonMatchBody(
        scrollController: scrollCtrl,
        hairstyleId: hairstyleId,
        hairstyleName: hairstyleName,
        tryOnImageUrl: tryOnImageUrl,
        faceShape: faceShape,
      ),
    ),
  );
}

class _SalonMatchBody extends ConsumerWidget {
  final ScrollController scrollController;
  final int hairstyleId;
  final String hairstyleName;
  final String? tryOnImageUrl;
  final String? faceShape;

  const _SalonMatchBody({
    required this.scrollController,
    required this.hairstyleId,
    required this.hairstyleName,
    this.tryOnImageUrl,
    this.faceShape,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(partnerSalonsForStyleProvider(hairstyleId));
    return ListView(
      controller: scrollController,
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
      children: [
        Center(
          child: Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(color: AppColors.line, borderRadius: BorderRadius.circular(2)),
          ),
        ),
        const SizedBox(height: 14),
        const Text('Cắt kiểu này ở đâu?', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
        const SizedBox(height: 4),
        Text('Salon đối tác nhận làm kiểu $hairstyleName',
            style: const TextStyle(fontSize: 12.5, color: AppColors.muted)),
        const SizedBox(height: 16),
        ...async.when<List<Widget>>(
          loading: () => const [
            Padding(padding: EdgeInsets.all(32), child: Center(child: CircularProgressIndicator())),
          ],
          error: (e, _) => [
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 24),
              child: Column(
                children: [
                  Text(friendlyApiError(e, 'Không tải được danh sách salon.'),
                      textAlign: TextAlign.center, style: const TextStyle(color: AppColors.muted)),
                  const SizedBox(height: 10),
                  OutlinedButton(
                    onPressed: () => ref.invalidate(partnerSalonsForStyleProvider(hairstyleId)),
                    child: const Text('Thử lại'),
                  ),
                ],
              ),
            ),
          ],
          data: (salons) {
            if (salons.isEmpty) {
              return [
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 20),
                  child: Text(
                    'Chưa có salon đối tác nhận làm kiểu này. Bạn vẫn có thể mang ảnh thử tóc tới salon quen để tư vấn.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: AppColors.muted, height: 1.4),
                  ),
                ),
                OutlinedButton(
                  onPressed: () {
                    final router = GoRouter.of(context);
                    Navigator.of(context).pop();
                    router.push('/salons');
                  },
                  child: const Text('Xem tất cả salon'),
                ),
              ];
            }
            return salons
                .map((s) => Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: _MatchTile(
                        salon: s,
                        onBook: () async {
                          final messenger = ScaffoldMessenger.of(context);
                          final navigator = Navigator.of(context);
                          final ok = await showBookingSheet(
                            context,
                            salon: s,
                            hairstyleId: hairstyleId,
                            hairstyleName: hairstyleName,
                            tryOnImageUrl: tryOnImageUrl,
                            faceShape: faceShape,
                          );
                          if (ok) {
                            navigator.pop();
                            messenger.showSnackBar(const SnackBar(
                              content: Text('Đã gửi yêu cầu đặt lịch. Salon sẽ xác nhận sớm.'),
                            ));
                          }
                        },
                        onDetail: () {
                          final router = GoRouter.of(context);
                          Navigator.of(context).pop();
                          router.push('/salons/${s.id}');
                        },
                      ),
                    ))
                .toList();
          },
        ),
      ],
    );
  }
}

class _MatchTile extends StatelessWidget {
  final Salon salon;
  final VoidCallback onBook;
  final VoidCallback onDetail;

  const _MatchTile({required this.salon, required this.onBook, required this.onDetail});

  @override
  Widget build(BuildContext context) {
    final price = salon.stylePrice ?? salon.priceFrom;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.line),
      ),
      child: Row(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: CachedNetworkImage(
              imageUrl: salon.imageUrl,
              width: 64,
              height: 64,
              fit: BoxFit.cover,
              errorWidget: (context, url, error) => Container(
                width: 64,
                height: 64,
                color: AppColors.canvas,
                child: const Icon(Icons.storefront_outlined, color: AppColors.muted),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: InkWell(
              onTap: onDetail,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(salon.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 2),
                  Text(
                    salon.distanceKm != null
                        ? '${salon.district} · ${salon.distanceKm!.toStringAsFixed(1)} km'
                        : salon.district,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 11.5, color: AppColors.muted),
                  ),
                  const SizedBox(height: 4),
                  Text(price > 0 ? 'Từ ${_vnd(price)}' : 'Giá liên hệ',
                      style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: AppColors.magenta)),
                ],
              ),
            ),
          ),
          const SizedBox(width: 8),
          SizedBox(
            height: 38,
            child: ElevatedButton(
              onPressed: onBook,
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 14),
                textStyle: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700),
              ),
              child: const Text('Đặt lịch'),
            ),
          ),
        ],
      ),
    );
  }
}

/// 150000 -> "150.000đ"
String _vnd(int v) {
  final s = v.toString();
  final buf = StringBuffer();
  for (var i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 == 0) buf.write('.');
    buf.write(s[i]);
  }
  return '${buf.toString()}đ';
}
