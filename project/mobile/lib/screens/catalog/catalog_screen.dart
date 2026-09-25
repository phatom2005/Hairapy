import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../api/api_client.dart';
import '../../models/hairstyle.dart';
import '../../providers/auth_provider.dart';
import '../../providers/saved_styles_provider.dart';
import '../../theme.dart';
import '../../widgets/app_bottom_nav.dart';

/// Bộ lọc dáng mặt — key tiếng Anh gửi lên backend (HairstyleCatalogController
/// tự dịch sang tiếng Việt để khớp DB), label tiếng Việt hiển thị cho người dùng.
const List<({String? key, String label})> _faceShapeFilters = [
  (key: null, label: 'Tất cả'),
  (key: 'oval', label: 'Trái xoan'),
  (key: 'round', label: 'Tròn'),
  (key: 'square', label: 'Vuông'),
  (key: 'heart', label: 'Trái tim'),
  (key: 'oblong', label: 'Dài'),
  (key: 'diamond', label: 'Kim cương'),
];

final _searchProvider = StateProvider.autoDispose<String>((ref) => '');
final _faceShapeProvider = StateProvider.autoDispose<String?>((ref) => null);

final catalogProvider = FutureProvider.autoDispose<List<Hairstyle>>((ref) async {
  final search = ref.watch(_searchProvider);
  final faceShape = ref.watch(_faceShapeProvider);
  final res = await ApiClient.instance.dio.get('/hairstyles', queryParameters: {
    if (search.trim().isNotEmpty) 'search': search.trim(),
    if (faceShape != null) 'faceShape': faceShape,
  });
  return (res.data as List).map((e) => Hairstyle.fromJson(e as Map<String, dynamic>)).toList();
});

class CatalogScreen extends ConsumerWidget {
  const CatalogScreen({super.key});

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
    final stylesAsync = ref.watch(catalogProvider);
    final savedAsync = ref.watch(savedStylesProvider);
    final savedIds = savedAsync.maybeWhen(data: (list) => list.map((e) => e.id).toSet(), orElse: () => <int>{});
    final activeShape = ref.watch(_faceShapeProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Kho kiểu tóc')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
            child: TextField(
              decoration: const InputDecoration(
                hintText: 'Tìm kiểu tóc...',
                prefixIcon: Icon(Icons.search, size: 20),
              ),
              onChanged: (v) => ref.read(_searchProvider.notifier).state = v,
            ),
          ),
          SizedBox(
            height: 40,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: _faceShapeFilters.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (context, i) {
                final f = _faceShapeFilters[i];
                final selected = activeShape == f.key;
                return ChoiceChip(
                  label: Text(f.label, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600)),
                  selected: selected,
                  selectedColor: AppColors.ink,
                  labelStyle: TextStyle(color: selected ? Colors.white : AppColors.ink),
                  backgroundColor: Colors.white,
                  side: const BorderSide(color: AppColors.line),
                  onSelected: (_) => ref.read(_faceShapeProvider.notifier).state = f.key,
                );
              },
            ),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: stylesAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(child: Text('Không tải được kho kiểu tóc: $e')),
              data: (styles) {
                if (styles.isEmpty) {
                  return const Center(child: Text('Không tìm thấy kiểu tóc phù hợp', style: TextStyle(color: AppColors.muted)));
                }
                return GridView.builder(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                  itemCount: styles.length,
                  // Dùng mainAxisExtent (chiều cao cố định theo px) thay vì
                  // childAspectRatio: tỉ lệ theo % dễ làm card cao hơn thực tế
                  // cần (nhất là khi hệ điều hành phóng to cỡ chữ), khiến nút
                  // "Thử ngay" bị tràn ra ngoài card và mất luôn cạnh dưới do
                  // Container có clipBehavior: Clip.antiAlias. Chiều cao cố
                  // định 248px đã tính dư cho ảnh + tên kiểu tóc + nút.
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    mainAxisSpacing: 14,
                    crossAxisSpacing: 14,
                    mainAxisExtent: 248,
                  ),
                  itemBuilder: (context, i) {
                    final h = styles[i];
                    return _CatalogCard(
                      hairstyle: h,
                      saved: savedIds.contains(h.id),
                      onTryNow: () => _handleTryStyle(context, ref, h),
                      onToggleSave: () {
                        final user = ref.read(authProvider).user;
                        if (user == null) {
                          context.push('/login');
                          return;
                        }
                        ref.read(savedStylesControllerProvider).toggle(h.id, savedIds.contains(h.id));
                      },
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
      bottomNavigationBar: const AppBottomNav(currentIndex: 1),
    );
  }
}

class _CatalogCard extends StatelessWidget {
  final Hairstyle hairstyle;
  final bool saved;
  final VoidCallback onTryNow;
  final VoidCallback onToggleSave;

  const _CatalogCard({
    required this.hairstyle,
    required this.saved,
    required this.onTryNow,
    required this.onToggleSave,
  });

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
                    top: 10, left: 10,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(color: AppColors.pink, borderRadius: BorderRadius.circular(999)),
                      child: const Text('PREMIUM', style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w700)),
                    ),
                  ),
                Positioned(
                  top: 6, right: 6,
                  child: Material(
                    color: Colors.white,
                    shape: const CircleBorder(),
                    child: IconButton(
                      iconSize: 18,
                      icon: Icon(saved ? Icons.favorite : Icons.favorite_border, color: AppColors.magenta),
                      onPressed: onToggleSave,
                    ),
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
                    // Ghi đè minimumSize: theme mặc định set chiều cao nút tối
                    // thiểu 52px (buttonElevatedTheme trong theme.dart) — nếu
                    // không ghi đè ở đây, nút vẫn hiển thị đúng 30px vì
                    // SizedBox ép constraint cứng, nhưng ghi rõ ra cho chắc và
                    // để padding chữ không bị bóp méo.
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
