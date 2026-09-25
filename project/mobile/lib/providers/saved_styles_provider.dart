import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/api_client.dart';
import '../models/hairstyle.dart';

/// Danh sách kiểu tóc đã lưu (Yêu thích) — GET /profile/saved-styles.
/// Dùng chung cho Catalog (hiện trạng thái tim đã lưu) và Profile (hiển thị lại).
final savedStylesProvider = FutureProvider.autoDispose<List<Hairstyle>>((ref) async {
  final res = await ApiClient.instance.dio.get('/profile/saved-styles');
  return (res.data as List).map((e) => Hairstyle.fromJson(e as Map<String, dynamic>)).toList();
});

/// Lưu/bỏ lưu 1 kiểu tóc — POST/DELETE /profile/saved-styles?hairstyleId=...
/// rồi tự invalidate savedStylesProvider để UI cập nhật ngay.
class SavedStylesController {
  SavedStylesController(this.ref);
  final Ref ref;

  Future<void> toggle(int hairstyleId, bool currentlySaved) async {
    if (currentlySaved) {
      await ApiClient.instance.dio.delete('/profile/saved-styles',
          queryParameters: {'hairstyleId': hairstyleId});
    } else {
      await ApiClient.instance.dio.post('/profile/saved-styles',
          queryParameters: {'hairstyleId': hairstyleId});
    }
    ref.invalidate(savedStylesProvider);
  }
}

final savedStylesControllerProvider = Provider((ref) => SavedStylesController(ref));
