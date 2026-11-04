import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../api/api_client.dart';
import '../../config/plans.dart';
import '../../models/payment_record.dart';
import '../../theme.dart';

/// GET /payments/my — lịch sử mua gói của chính user (chỉ xem; app không bán gói).
final myPaymentsProvider = FutureProvider.autoDispose<List<PaymentRecord>>((ref) async {
  final res = await ApiClient.instance.dio.get('/payments/my', queryParameters: {'size': 30});
  return parsePaymentPage(res.data);
});

class PaymentHistoryScreen extends ConsumerWidget {
  const PaymentHistoryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(myPaymentsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Lịch sử thanh toán')),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(myPaymentsProvider),
        child: async.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => ListView(
            children: [
              const SizedBox(height: 120),
              Center(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  child: Text(friendlyApiError(e, 'Không tải được lịch sử thanh toán.'),
                      textAlign: TextAlign.center, style: const TextStyle(color: AppColors.muted)),
                ),
              ),
            ],
          ),
          data: (items) {
            if (items.isEmpty) {
              return ListView(
                padding: const EdgeInsets.all(28),
                children: const [
                  SizedBox(height: 60),
                  Icon(Icons.receipt_long_outlined, size: 56, color: AppColors.muted),
                  SizedBox(height: 12),
                  Text('Bạn chưa có giao dịch nào',
                      textAlign: TextAlign.center, style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                ],
              );
            }
            return ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: items.length,
              separatorBuilder: (context, index) => const SizedBox(height: 10),
              itemBuilder: (context, i) => _PaymentTile(payment: items[i]),
            );
          },
        ),
      ),
    );
  }
}

class _PaymentTile extends StatelessWidget {
  final PaymentRecord payment;
  const _PaymentTile({required this.payment});

  Color _statusColor(String s) {
    switch (s) {
      case 'PAID':
        return const Color(0xFF15803D);
      case 'PENDING':
        return const Color(0xFFB45309);
      default:
        return AppColors.muted;
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = payment;
    final color = _statusColor(p.status);
    final date = p.displayDate;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.line),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(p.planName, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                const SizedBox(height: 2),
                Text(
                  'Mã đơn ${p.orderCode}${date != null ? ' · ${formatDateTime(date)}' : ''}',
                  style: const TextStyle(fontSize: 11.5, color: AppColors.muted),
                ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(formatVnd(p.amount),
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.magenta)),
              const SizedBox(height: 4),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(p.statusLabel,
                    style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: color)),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
