import 'package:dio/dio.dart';
import 'package:gal/gal.dart';
import 'package:path_provider/path_provider.dart';

/// Tải ảnh từ URL rồi lưu vào thư viện ảnh (album Hairapy).
/// Trả về null nếu thành công, hoặc câu thông báo lỗi tiếng Việt để hiện cho người dùng.
class GallerySaver {
  GallerySaver._();

  static Future<String?> saveFromUrl(String url) async {
    try {
      final dir = await getTemporaryDirectory();
      final path = '${dir.path}/hairapy_${DateTime.now().millisecondsSinceEpoch}.jpg';
      await Dio().download(
        url,
        path,
        options: Options(
          receiveTimeout: const Duration(seconds: 30),
          sendTimeout: const Duration(seconds: 15),
        ),
      );
      if (!await Gal.hasAccess()) {
        final granted = await Gal.requestAccess();
        if (!granted) {
          return 'Hairapy cần quyền truy cập ảnh để lưu. Hãy cấp quyền trong Cài đặt.';
        }
      }
      await Gal.putImage(path, album: 'Hairapy');
      return null;
    } catch (_) {
      return 'Không lưu được ảnh. Kiểm tra mạng và thử lại.';
    }
  }
}
