import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../api/api_client.dart';
import '../../models/hairstyle.dart';
import '../../providers/auth_provider.dart';
import '../../providers/scan_state_provider.dart';
import '../../theme.dart';

// Bản đồ dịch dáng mặt sang tiếng Việt — copy nguyên từ ResultsPage.jsx để
// hiển thị đúng như bên web (faceShape lưu backend vẫn là tiếng Anh gốc).
const Map<String, String> _faceShapeTranslation = {
  'Oval': 'Trái xoan (Oval)',
  'Round': 'Tròn (Round)',
  'Square': 'Vuông (Square)',
  'Heart': 'Trái tim (Heart)',
  'Oblong': 'Dài/Thuôn (Oblong)',
  'Diamond': 'Kim cương (Diamond)',
};

// Lý do lựa chọn kiểu tóc theo dáng mặt — copy nguyên nội dung REASONS_MAP bên web.
const Map<String, List<({String title, String desc})>> _reasonsMap = {
  'Oval': [
    (
      title: 'Tôn vinh sự cân bằng tự nhiên',
      desc: 'AI đã nhận diện được xương gò má đối xứng của bạn. Các kiểu tóc layer sẽ giúp làm nổi bật sự hài hòa tự nhiên và thanh tú của dáng mặt Oval.'
    ),
    (
      title: 'Làm nổi bật đường nét thanh tú',
      desc: 'Đường hàm thon gọn và trán cân đối là ưu điểm lớn. Các kiểu tóc ngắn hoặc vén sau tai sẽ tôn vinh cấu trúc xương lý tưởng này.'
    ),
  ],
  'Round': [
    (
      title: 'Kéo dài tỷ lệ gương mặt',
      desc: 'Gương mặt tròn có chiều rộng gần bằng chiều dài. Các kiểu tóc dài tỉa tầng hoặc bob lệch sẽ tạo cảm giác gương mặt thon thả và dài hơn.'
    ),
    (
      title: 'Tạo độ phồng phần đỉnh đầu',
      desc: 'Phần đỉnh đầu được sấy phồng giúp dịch chuyển trọng tâm thị giác của người đối diện lên trên, làm gương mặt trông thanh thoát hơn.'
    ),
  ],
  'Square': [
    (
      title: 'Làm mềm các góc cạnh',
      desc: 'Gương mặt vuông có phần hàm sắc sảo. Sóng nước mềm mại hoặc wolf cut tỉa tầng sẽ che bớt góc hàm và tạo độ nữ tính, mềm mại.'
    ),
    (
      title: 'Tránh các đường cắt ngang thô',
      desc: 'Các đường layer so le mềm mại ôm sát gương mặt sẽ giúp phá vỡ các khối vuông góc cạnh một cách khéo léo và tự nhiên.'
    ),
  ],
  'Heart': [
    (
      title: 'Cân bằng nửa dưới gương mặt',
      desc: 'Gương mặt hình tim có trán rộng và cằm nhọn. Các lọn tóc xoăn nhẹ ở phần đuôi giúp bù đắp chiều ngang cho phần cằm hẹp.'
    ),
    (
      title: 'Giảm độ rộng vùng trán thái dương',
      desc: 'Mái thưa hoặc mái bay rủ nhẹ sang hai bên sẽ che bớt phần thái dương rộng, tạo tỷ lệ cân đối hơn cho phần trên khuôn mặt.'
    ),
  ],
  'Oblong': [
    (
      title: 'Mở rộng chiều ngang gương mặt',
      desc: 'Khuôn mặt thuôn dài cần các kiểu tóc xoăn nhẹ hoặc sóng lơi bồng bềnh để tạo cảm giác đầy đặn hơn về chiều rộng.'
    ),
    (
      title: 'Rút ngắn chiều dài bằng mái che',
      desc: 'Mái bằng hoặc mái bay che bớt phần trán cao sẽ giúp rút ngắn chiều dài thị giác một cách đáng kể.'
    ),
  ],
  'Diamond': [
    (
      title: 'Làm dịu phần gò má nhô cao',
      desc: 'Dáng mặt kim cương có gò má rộng và trán, cằm hẹp. Các kiểu tóc bob tỉa tầng ôm nhẹ sẽ che bớt độ rộng vùng gò má.'
    ),
    (
      title: 'Tạo độ phồng vùng thái dương',
      desc: 'Độ phồng ở phần thái dương và chân tóc quanh cằm giúp cân đối khoảng cách so với phần gò má rộng nhất.'
    ),
  ],
};

/// Gợi ý kiểu tóc theo ĐÚNG dáng mặt vừa phân tích (không còn trả về nguyên
/// kho tóc như trước) — khớp query ["hairstyles", faceShapeVi, gender] bên web.
/// HairstyleCatalogController tự nhận key tiếng Anh viết thường (oval/round/...)
/// và dịch sang tiếng Việt để so khớp DB, nên chỉ cần lowercase faceShape gốc.
final _hairstylesByFaceShapeProvider =
    FutureProvider.autoDispose.family<List<Hairstyle>, String>((ref, faceShape) async {
  final res = await ApiClient.instance.dio.get('/hairstyles', queryParameters: {
    'faceShape': faceShape.toLowerCase(),
  });
  return (res.data as List).map((e) => Hairstyle.fromJson(e as Map<String, dynamic>)).toList();
});

class ResultsScreen extends ConsumerWidget {
  const ResultsScreen({super.key});

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
    final scanState = ref.watch(scanStateProvider);
    final faceShape = scanState.faceShape;

    // Chưa quét lần nào trong phiên này (vd: người dùng gõ thẳng URL /results,
    // hoặc mới mở app) -> quay lại màn Scan, khớp guard useEffect bên
    // ResultsPage.jsx (if (!analysisResult) navigate("/scan")).
    if (faceShape == null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (context.mounted) context.go('/scan');
      });
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final stylesAsync = ref.watch(_hairstylesByFaceShapeProvider(faceShape));
    final faceShapeText = _faceShapeTranslation[faceShape] ?? faceShape;
    final reasons = _reasonsMap[faceShape] ?? _reasonsMap['Oval']!;
    final metrics = scanState.metrics;

    return Scaffold(
      appBar: AppBar(title: const Text('Kết quả phân tích')),
      body: stylesAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Không tải được danh sách: $e')),
        data: (styles) => ListView(
          padding: const EdgeInsets.all(20),
          children: [
            // ── Hồ sơ khuôn mặt ─────────────────────────────────────────
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppColors.line),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Hồ sơ khuôn mặt', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 12),
                  if (scanState.image != null)
                    ClipRRect(
                      borderRadius: BorderRadius.circular(14),
                      child: AspectRatio(
                        aspectRatio: 1,
                        child: Image.file(scanState.image!, fit: BoxFit.cover),
                      ),
                    ),
                  const SizedBox(height: 14),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    decoration: BoxDecoration(color: AppColors.canvas, borderRadius: BorderRadius.circular(12)),
                    child: Row(
                      children: [
                        const Icon(Icons.face_retouching_natural, color: AppColors.primary, size: 20),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text('Hình dáng khuôn mặt: $faceShapeText',
                              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                        ),
                      ],
                    ),
                  ),
                  if (metrics != null) ...[
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          child: _MetricTile(
                            label: 'Tỷ lệ rộng/dài',
                            value: '${(metrics.widthToLength * 100).toStringAsFixed(0)}%',
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: _MetricTile(
                            label: 'Tỷ lệ trán/hàm',
                            value: metrics.foreheadToJaw.toStringAsFixed(2),
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 20),

            // ── Vì sao hợp với bạn ──────────────────────────────────────
            const Text('Vì sao những kiểu này hợp với bạn', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
            const SizedBox(height: 10),
            ...reasons.map((r) => Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14)),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(r.title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5)),
                        const SizedBox(height: 4),
                        Text(r.desc, style: const TextStyle(fontSize: 12.5, color: AppColors.mauve, height: 1.4)),
                      ],
                    ),
                  ),
                )),
            const SizedBox(height: 10),

            // ── Kiểu tóc gợi ý ──────────────────────────────────────────
            const Text('Kiểu tóc gợi ý', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
            const SizedBox(height: 12),
            if (styles.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 24),
                child: Center(child: Text('Chưa có kiểu tóc gợi ý riêng cho dáng mặt này.', style: TextStyle(color: AppColors.muted))),
              )
            else
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

class _MetricTile extends StatelessWidget {
  final String label;
  final String value;
  const _MetricTile({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(color: AppColors.canvas, borderRadius: BorderRadius.circular(12)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(fontSize: 11, color: AppColors.muted)),
          const SizedBox(height: 2),
          Text(value, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
        ],
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
