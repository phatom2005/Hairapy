import 'dart:io';
import 'dart:ui' as ui;

/// Kiểm tra nhanh chất lượng ảnh trên máy (không gửi đi đâu) để cảnh báo sớm
/// trước khi tốn lượt quét/thử tóc: ảnh quá tối, quá sáng hoặc bị mờ.
/// Chỉ là heuristic nên kết quả dùng để CẢNH BÁO, không chặn người dùng.
class ImageQualityChecker {
  ImageQualityChecker._();

  static const _sampleWidth = 320; // thu nhỏ để tính nhanh (~130k điểm ảnh)
  static const _darkThreshold = 55.0; // độ sáng trung bình (0-255)
  static const _brightThreshold = 225.0;
  static const _blurThreshold = 20.0; // phương sai Laplacian; thấp = mờ (ngưỡng nới để tránh báo nhầm)

  /// Trả về câu cảnh báo tiếng Việt, hoặc null nếu ảnh ổn / không kiểm tra được.
  static Future<String?> check(File file) async {
    try {
      final bytes = await file.readAsBytes();
      final codec = await ui.instantiateImageCodec(bytes, targetWidth: _sampleWidth);
      final frame = await codec.getNextFrame();
      final image = frame.image;
      final w = image.width;
      final h = image.height;
      final data = await image.toByteData(format: ui.ImageByteFormat.rawRgba);
      image.dispose();
      codec.dispose();
      if (data == null || w < 8 || h < 8) return null;

      // Chuyển xám + tính độ sáng trung bình
      final gray = List<double>.filled(w * h, 0);
      double sum = 0;
      for (var i = 0; i < w * h; i++) {
        final r = data.getUint8(i * 4);
        final g = data.getUint8(i * 4 + 1);
        final b = data.getUint8(i * 4 + 2);
        final v = 0.299 * r + 0.587 * g + 0.114 * b;
        gray[i] = v;
        sum += v;
      }
      final mean = sum / (w * h);

      if (mean < _darkThreshold) {
        return 'Ảnh hơi tối. Hãy chụp ở nơi đủ sáng để AI nhận diện chính xác hơn.';
      }
      if (mean > _brightThreshold) {
        return 'Ảnh bị chói/quá sáng. Hãy tránh ánh sáng chiếu thẳng vào mặt.';
      }

      // Phương sai Laplacian: đo độ nét (ảnh mờ thì ít cạnh → phương sai thấp)
      double lapSum = 0;
      double lapSqSum = 0;
      var n = 0;
      for (var y = 1; y < h - 1; y++) {
        for (var x = 1; x < w - 1; x++) {
          final i = y * w + x;
          final lap = gray[i - 1] + gray[i + 1] + gray[i - w] + gray[i + w] - 4 * gray[i];
          lapSum += lap;
          lapSqSum += lap * lap;
          n++;
        }
      }
      final lapMean = lapSum / n;
      final variance = lapSqSum / n - lapMean * lapMean;
      if (variance < _blurThreshold) {
        return 'Ảnh có vẻ bị mờ. Hãy giữ chắc tay và chụp lại cho rõ nét.';
      }
      return null;
    } catch (_) {
      return null; // không kiểm tra được thì thôi, không làm phiền người dùng
    }
  }
}
