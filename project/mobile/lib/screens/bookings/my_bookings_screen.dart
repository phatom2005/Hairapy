import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../api/api_client.dart';
import '../../config/plans.dart';
import '../../models/booking.dart';
import '../../services/link_opener.dart';
import '../../theme.dart';

/// GET /bookings/my — lịch hẹn salon của tôi (Page -> content), mới nhất trước.
final myBookingsProvider = FutureProvider.autoDispose<List<MyBooking>>((ref) async {
  final res = await ApiClient.instance.dio.get('/bookings/my', queryParameters: {'size': 30});
  final data = res.data;
  final list = data is Map ? (data['content'] as List? ?? const []) : (data as List);
  return list.map((e) => MyBooking.fromJson(e as Map<String, dynamic>)).toList();
});

class MyBookingsScreen extends ConsumerWidget {
  const MyBookingsScreen({super.key});

  Future<void> _cancel(BuildContext context, WidgetRef ref, MyBooking b) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Huỷ lịch hẹn?'),
        content: Text('Huỷ lịch tại ${b.salonName}${b.preferredTime != null ? ' lúc ${formatDateTime(b.preferredTime!)}' : ''}?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Giữ lịch')),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Huỷ lịch')),
        ],
      ),
    );
    if (confirm != true || !context.mounted) return;
    final messenger = ScaffoldMessenger.of(context);
    try {
      await ApiClient.instance.dio.put('/bookings/${b.id}/cancel');
      ref.invalidate(myBookingsProvider);
      messenger.showSnackBar(const SnackBar(content: Text('Đã huỷ lịch hẹn.')));
    } catch (e) {
      messenger.showSnackBar(SnackBar(content: Text(friendlyApiError(e, 'Không huỷ được lịch hẹn.'))));
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(myBookingsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Lịch hẹn salon')),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(myBookingsProvider),
        child: async.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => ListView(
            children: [
              const SizedBox(height: 120),
              Center(
                child: Text(friendlyApiError(e, 'Không tải được lịch hẹn.'),
                    style: const TextStyle(color: AppColors.muted)),
              ),
            ],
          ),
          data: (items) {
            if (items.isEmpty) {
              return ListView(
                padding: const EdgeInsets.all(28),
                children: [
                  const SizedBox(height: 60),
                  const Icon(Icons.event_note_outlined, size: 56, color: AppColors.muted),
                  const SizedBox(height: 12),
                  const Text('Bạn chưa có lịch hẹn nào',
                      textAlign: TextAlign.center, style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                  const SizedBox(height: 6),
                  const Text(
                    'Thử một kiểu tóc rồi bấm "Cắt kiểu này ở đâu?" để đặt lịch với salon đối tác.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: AppColors.muted, fontSize: 13, height: 1.4),
                  ),
                  const SizedBox(height: 18),
                  OutlinedButton(onPressed: () => context.push('/salons'), child: const Text('Xem salon đối tác')),
                ],
              );
            }
            final now = DateTime.now();
            return ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: items.length,
              separatorBuilder: (context, index) => const SizedBox(height: 12),
              itemBuilder: (context, i) {
                final b = items[i];
                return _BookingCard(
                  booking: b,
                  canCancel: b.canCancel(now),
                  onCancel: () => _cancel(context, ref, b),
                );
              },
            );
          },
        ),
      ),
    );
  }
}

class _BookingCard extends StatelessWidget {
  final MyBooking booking;
  final bool canCancel;
  final VoidCallback onCancel;

  const _BookingCard({required this.booking, required this.canCancel, required this.onCancel});

  Color _statusColor(String s) {
    switch (s) {
      case 'CONFIRMED':
        return const Color(0xFF15803D);
      case 'COMPLETED':
        return AppColors.primary;
      case 'REJECTED':
      case 'NO_SHOW':
        return Colors.red;
      case 'PENDING':
        return const Color(0xFFB45309);
      default:
        return AppColors.muted;
    }
  }

  @override
  Widget build(BuildContext context) {
    final b = booking;
    final color = _statusColor(b.status);
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.line),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if ((b.tryOnImageUrl ?? '').isNotEmpty) ...[
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: CachedNetworkImage(
                imageUrl: b.tryOnImageUrl!,
                width: 64,
                height: 80,
                fit: BoxFit.cover,
                errorWidget: (context, url, error) => const SizedBox(width: 64, height: 80),
              ),
            ),
            const SizedBox(width: 12),
          ],
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(kBookingStatusLabels[b.status] ?? b.status,
                      style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: color)),
                ),
                const SizedBox(height: 6),
                Text(b.salonName, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                if (b.preferredTime != null)
                  Text('Hẹn lúc ${formatDateTime(b.preferredTime!)}',
                      style: const TextStyle(fontSize: 12.5, color: AppColors.mauve)),
                if ((b.hairstyleName ?? '').isNotEmpty)
                  Text('Kiểu: ${b.hairstyleName}', style: const TextStyle(fontSize: 12, color: AppColors.muted)),
                if ((b.salonNote ?? '').isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text('Salon nhắn: ${b.salonNote}',
                      style: const TextStyle(fontSize: 12, color: AppColors.mauve, fontStyle: FontStyle.italic)),
                ],
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  children: [
                    if ((b.salonPhone ?? '').isNotEmpty && (b.status == 'CONFIRMED' || b.status == 'PENDING'))
                      TextButton.icon(
                        onPressed: () => callPhone(context, b.salonPhone!),
                        icon: const Icon(Icons.call_outlined, size: 16),
                        label: const Text('Gọi salon'),
                      ),
                    if (b.salonId != null)
                      TextButton(
                        onPressed: () => context.push('/salons/${b.salonId}'),
                        child: const Text('Xem salon'),
                      ),
                    if (canCancel)
                      TextButton(
                        onPressed: onCancel,
                        style: TextButton.styleFrom(foregroundColor: Colors.red),
                        child: const Text('Huỷ lịch'),
                      ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
