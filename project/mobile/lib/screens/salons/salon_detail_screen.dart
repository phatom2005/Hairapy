import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../api/api_client.dart';
import '../../models/salon.dart';
import '../../services/link_opener.dart';
import '../../theme.dart';
import '../../widgets/booking_sheet.dart';

/// GET /salons/{id} — chi tiết salon + kiểu tóc nhận làm (công khai).
final salonDetailProvider = FutureProvider.autoDispose.family<SalonDetail, int>((ref, id) async {
  final res = await ApiClient.instance.dio.get('/salons/$id');
  return SalonDetail.fromJson(res.data as Map<String, dynamic>);
});

class SalonDetailScreen extends ConsumerWidget {
  final int salonId;
  const SalonDetailScreen({super.key, required this.salonId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(salonDetailProvider(salonId));
    return Scaffold(
      appBar: AppBar(title: const Text('Chi tiết salon')),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  friendlyApiError(e, 'Không tìm thấy salon. Salon có thể đã ngừng hoạt động.'),
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: AppColors.muted),
                ),
                const SizedBox(height: 12),
                OutlinedButton(
                  onPressed: () => ref.invalidate(salonDetailProvider(salonId)),
                  child: const Text('Thử lại'),
                ),
              ],
            ),
          ),
        ),
        data: (detail) => _Body(detail: detail),
      ),
    );
  }
}

class _Body extends StatelessWidget {
  final SalonDetail detail;
  const _Body({required this.detail});

  @override
  Widget build(BuildContext context) {
    final s = detail.salon;
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(22),
          child: AspectRatio(
            aspectRatio: 16 / 10,
            child: CachedNetworkImage(
              imageUrl: s.imageUrl,
              fit: BoxFit.cover,
              errorWidget: (context, url, error) => Container(
                color: AppColors.canvas,
                child: const Icon(Icons.storefront_outlined, size: 48, color: AppColors.muted),
              ),
            ),
          ),
        ),
        const SizedBox(height: 14),
        Wrap(
          spacing: 6,
          runSpacing: 6,
          children: [
            if (s.partner) const _Chip(label: 'Salon đối tác', color: AppColors.pink),
            if (s.verified) const _Chip(label: 'Hairapy kiểm định', color: AppColors.primary),
          ],
        ),
        const SizedBox(height: 10),
        Text(s.name, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
        const SizedBox(height: 6),
        Row(
          children: [
            const Icon(Icons.star_rounded, size: 18, color: Colors.amber),
            const SizedBox(width: 3),
            Text(s.rating.toStringAsFixed(1), style: const TextStyle(fontWeight: FontWeight.w700)),
            const SizedBox(width: 12),
            if (s.priceFrom > 0)
              Text('Giá từ ${(s.priceFrom / 1000).round()}k',
                  style: const TextStyle(color: AppColors.magenta, fontWeight: FontWeight.w700)),
          ],
        ),
        const SizedBox(height: 8),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Icon(Icons.place_outlined, size: 18, color: AppColors.muted),
            const SizedBox(width: 6),
            Expanded(
              child: Text('${s.address}${s.district.isNotEmpty ? ', ${s.district}' : ''}',
                  style: const TextStyle(fontSize: 13, color: AppColors.mauve, height: 1.35)),
            ),
          ],
        ),
        if (s.services.isNotEmpty) ...[
          const SizedBox(height: 12),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: s.services.map((t) => _Chip(label: t, color: AppColors.mauve, outlined: true)).toList(),
          ),
        ],
        if ((s.description ?? '').trim().isNotEmpty) ...[
          const SizedBox(height: 14),
          Text(s.description!, style: const TextStyle(fontSize: 13.5, color: AppColors.mauve, height: 1.45)),
        ],
        const SizedBox(height: 18),
        Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: () => openMaps(context, lat: s.latitude, lng: s.longitude, address: '${s.name} ${s.address}'),
                icon: const Icon(Icons.map_outlined, size: 18),
                label: const Text('Chỉ đường'),
              ),
            ),
            if ((s.phone ?? '').isNotEmpty) ...[
              const SizedBox(width: 10),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => callPhone(context, s.phone!),
                  icon: const Icon(Icons.call_outlined, size: 18),
                  label: const Text('Gọi salon'),
                ),
              ),
            ],
          ],
        ),
        if (s.partner) ...[
          const SizedBox(height: 10),
          SizedBox(
            height: 50,
            child: ElevatedButton.icon(
              onPressed: () async {
                final messenger = ScaffoldMessenger.of(context);
                final ok = await showBookingSheet(context, salon: s);
                if (ok) {
                  messenger.showSnackBar(
                    const SnackBar(content: Text('Đã gửi yêu cầu đặt lịch. Salon sẽ xác nhận sớm.')),
                  );
                }
              },
              icon: const Icon(Icons.event_available_outlined),
              label: const Text('Đặt lịch hẹn'),
            ),
          ),
        ],
        const SizedBox(height: 22),
        Text('Kiểu tóc nhận làm (${detail.hairstyles.length})',
            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
        const SizedBox(height: 10),
        if (detail.hairstyles.isEmpty)
          const Text(
            'Salon nhận làm nhiều kiểu theo yêu cầu. Bạn có thể mang ảnh thử tóc từ Hairapy tới để được tư vấn.',
            style: TextStyle(fontSize: 13, color: AppColors.muted, height: 1.4),
          )
        else
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: detail.hairstyles.length,
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 3,
              mainAxisSpacing: 10,
              crossAxisSpacing: 10,
              mainAxisExtent: 160,
            ),
            itemBuilder: (context, i) {
              final h = detail.hairstyles[i];
              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: CachedNetworkImage(
                        imageUrl: h.imageUrl,
                        fit: BoxFit.cover,
                        width: double.infinity,
                        errorWidget: (context, url, error) => Container(color: AppColors.canvas),
                      ),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(h.name, maxLines: 1, overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700)),
                  if (h.price != null)
                    Text('${(h.price! / 1000).round()}k',
                        style: const TextStyle(fontSize: 11, color: AppColors.magenta, fontWeight: FontWeight.w700)),
                ],
              );
            },
          ),
      ],
    );
  }
}

class _Chip extends StatelessWidget {
  final String label;
  final Color color;
  final bool outlined;
  const _Chip({required this.label, required this.color, this.outlined = false});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: outlined ? Colors.white : color.withValues(alpha: 0.12),
        border: outlined ? Border.all(color: AppColors.line) : null,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: color)),
    );
  }
}
