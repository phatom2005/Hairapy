import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../providers/auth_provider.dart';
import '../../theme.dart';

/// 2 gói dịch vụ khớp đúng CheckoutPage.jsx bên web:
/// PRO (Gói Tuần, 49.000đ/7 ngày) và PREMIUM (Gói Tháng, 99.000đ/30 ngày).
class _Plan {
  final String code; // gửi lên POST /payments/create {plan}
  final String title;
  final String price;
  final String period;
  final List<String> features;
  const _Plan(this.code, this.title, this.price, this.period, this.features);
}

const _plans = [
  _Plan('PRO', 'Gói Tuần', '49.000đ', '7 ngày', [
    '5 lần quét AI phân tích khuôn mặt mỗi ngày',
    '20 lần thử kiểu tóc mới mỗi ngày',
    'Ưu đãi giảm giá 10% tại salon liên kết',
    'Không chèn watermark, xuất ảnh HD',
  ]),
  _Plan('PREMIUM', 'Gói Tháng', '99.000đ', '30 ngày', [
    'Quét hình ảnh AI không giới hạn',
    'Phân tích chuyên sâu hình dáng & màu sắc',
    'Ưu đãi giảm giá 30% tại salon liên kết',
    'Tư vấn 1:1 trực tiếp cùng Stylist chuyên nghiệp',
    'Không chèn watermark, xuất ảnh HD',
  ]),
];

class PricingScreen extends ConsumerStatefulWidget {
  const PricingScreen({super.key});

  @override
  ConsumerState<PricingScreen> createState() => _PricingScreenState();
}

class _PricingScreenState extends ConsumerState<PricingScreen> {
  int _selected = 0;

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authProvider).user;
    final plan = _plans[_selected];

    return Scaffold(
      backgroundColor: AppColors.ink,
      appBar: AppBar(
        backgroundColor: AppColors.ink,
        foregroundColor: Colors.white,
        leading: IconButton(icon: const Icon(Icons.close), onPressed: () => context.pop()),
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(24, 4, 24, 8),
                child: Column(
                  children: [
                    const Text('PHIÊN BẢN GIỚI HẠN',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1, color: AppColors.lime)),
                    const SizedBox(height: 8),
                    const Text('Nâng Cấp Trải Nghiệm\nPremium',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 24, fontWeight: FontWeight.w700, color: Colors.white, height: 1.25)),
                    const SizedBox(height: 8),
                    const Text(
                      'Mở khoá toàn bộ bộ lọc AI, ảnh HD không watermark và ưu đãi salon đối tác.',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 13, color: Colors.white60),
                    ),
                    const SizedBox(height: 22),
                    for (int i = 0; i < _plans.length; i++)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: InkWell(
                          borderRadius: BorderRadius.circular(18),
                          onTap: () => setState(() => _selected = i),
                          child: Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(18),
                              color: _selected == i ? AppColors.lime.withValues(alpha: 0.08) : null,
                              border: Border.all(
                                color: _selected == i ? AppColors.lime : Colors.white24,
                                width: _selected == i ? 2 : 1.5,
                              ),
                            ),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(_plans[i].title,
                                          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.white)),
                                      const SizedBox(height: 2),
                                      Text(_plans[i].period == '7 ngày' ? 'Trải nghiệm nhanh' : 'Tiết kiệm & đầy đủ nhất',
                                          style: const TextStyle(fontSize: 11.5, color: Colors.white54)),
                                    ],
                                  ),
                                ),
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    Text(_plans[i].price,
                                        style: TextStyle(
                                            fontSize: 18, fontWeight: FontWeight.w700,
                                            color: _selected == i ? AppColors.lime : Colors.white)),
                                    Text('/ ${_plans[i].period}', style: const TextStyle(fontSize: 10.5, color: Colors.white38)),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    const SizedBox(height: 8),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        for (final f in plan.features)
                          Padding(
                            padding: const EdgeInsets.only(bottom: 10),
                            child: Row(
                              children: [
                                Container(
                                  width: 26, height: 26,
                                  decoration: BoxDecoration(color: AppColors.lime.withValues(alpha: 0.15), shape: BoxShape.circle),
                                  child: const Icon(Icons.check, size: 14, color: AppColors.lime),
                                ),
                                const SizedBox(width: 10),
                                Expanded(child: Text(f, style: const TextStyle(fontSize: 13, color: Colors.white))),
                              ],
                            ),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 8, 24, 20),
              child: Column(
                children: [
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(backgroundColor: AppColors.lime, foregroundColor: AppColors.ink),
                      onPressed: () {
                        if (user == null) {
                          context.push('/login');
                          return;
                        }
                        context.push('/checkout', extra: plan.code);
                      },
                      child: const Text('Đăng ký ngay'),
                    ),
                  ),
                  const SizedBox(height: 10),
                  const Text('Thanh toán qua PayOS / VietQR · Huỷ bất kỳ lúc nào',
                      style: TextStyle(fontSize: 11, color: Colors.white38)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
