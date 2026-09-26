import 'dart:io';
import 'dart:typed_data';
import 'dart:ui' as ui;
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';

/// Tao 1 anh "card" ghep truoc/sau + thuong hieu Hairapy roi mo share sheet
/// cua he dieu hanh (Zalo/Instagram/Messenger/...). Day la diem nhan tang
/// truong: moi lan nguoi dung share la 1 kenh marketing mien phi cho startup,
/// khong chi la 1 tinh nang UX don thuan.
class ShareCardGenerator {
  static Future<ui.Image> _decodeBytes(List<int> bytes) async {
    final codec = await ui.instantiateImageCodec(Uint8List.fromList(bytes));
    final frame = await codec.getNextFrame();
    return frame.image;
  }

  // Ve 1 anh vao 1 vung hinh chu nhat theo kieu BoxFit.cover (giu ty le, cat
  // bot phan thua) -- tu viet thay vi phu thuoc widget vi dang lam viec truc
  // tiep tren Canvas/PictureRecorder, khong phai cay widget.
  static void _drawCover(Canvas canvas, ui.Image img, Rect dest) {
    final srcAspect = img.width / img.height;
    final dstAspect = dest.width / dest.height;
    late Rect src;
    if (srcAspect > dstAspect) {
      final srcW = img.height * dstAspect;
      final dx = (img.width - srcW) / 2;
      src = Rect.fromLTWH(dx, 0, srcW, img.height.toDouble());
    } else {
      final srcH = img.width / dstAspect;
      final dy = (img.height - srcH) / 2;
      src = Rect.fromLTWH(0, dy, img.width.toDouble(), srcH);
    }
    canvas.drawImageRect(img, src, dest, Paint());
  }

  static void _drawText(
    Canvas canvas,
    String text,
    Offset offset, {
    double fontSize = 28,
    FontWeight fontWeight = FontWeight.w600,
    Color color = Colors.white,
    double? maxWidth,
    List<Shadow>? shadows,
  }) {
    final tp = TextPainter(
      text: TextSpan(text: text, style: TextStyle(color: color, fontSize: fontSize, fontWeight: fontWeight, shadows: shadows)),
      textDirection: TextDirection.ltr,
    )..layout(maxWidth: maxWidth ?? double.infinity);
    tp.paint(canvas, offset);
  }

  /// [beforeImage]: ảnh gốc lúc quét (file local). [afterImageUrl]: URL ảnh
  /// kết quả AI trả về (Cloudflare R2). [styleName]: tên kiểu tóc đã thử.
  static Future<void> shareBeforeAfter({
    required File beforeImage,
    required String afterImageUrl,
    required String styleName,
  }) async {
    final beforeBytes = await beforeImage.readAsBytes();
    final response = await Dio().get<List<int>>(
      afterImageUrl,
      options: Options(responseType: ResponseType.bytes),
    );
    final afterBytes = response.data ?? const <int>[];

    final beforeImg = await _decodeBytes(beforeBytes);
    final afterImg = await _decodeBytes(afterBytes);

    const cardWidth = 1080.0;
    const halfWidth = cardWidth / 2;
    const photoHeight = 1080.0;
    const footerHeight = 180.0;
    const cardHeight = photoHeight + footerHeight;

    final recorder = ui.PictureRecorder();
    final canvas = Canvas(recorder, const Rect.fromLTWH(0, 0, cardWidth, cardHeight));

    // Nen toi cho phan footer thuong hieu.
    canvas.drawRect(const Rect.fromLTWH(0, 0, cardWidth, cardHeight), Paint()..color = const Color(0xFF1A1A1A));

    _drawCover(canvas, beforeImg, const Rect.fromLTWH(0, 0, halfWidth, photoHeight));
    _drawCover(canvas, afterImg, const Rect.fromLTWH(halfWidth, 0, halfWidth, photoHeight));

    // Vach ngan trang giua 2 nua anh.
    canvas.drawRect(Rect.fromLTWH(halfWidth - 2, 0, 4, photoHeight), Paint()..color = Colors.white);

    const labelShadow = [Shadow(blurRadius: 8, color: Colors.black87)];
    _drawText(canvas, 'TRƯỚC', const Offset(28, 28), fontSize: 34, fontWeight: FontWeight.w800, shadows: labelShadow);
    _drawText(canvas, 'SAU', Offset(halfWidth + 28, 28), fontSize: 34, fontWeight: FontWeight.w800, shadows: labelShadow);

    // Footer thuong hieu.
    _drawText(canvas, 'Hairapy', const Offset(40, photoHeight + 20),
        fontSize: 46, fontWeight: FontWeight.w900, color: const Color(0xFFD0EE88));
    _drawText(
      canvas,
      'Scan. Style. Smile.  ·  Kiểu tóc: $styleName',
      const Offset(40, photoHeight + 84),
      fontSize: 26,
      fontWeight: FontWeight.w500,
      color: Colors.white70,
      maxWidth: cardWidth - 80,
    );

    final picture = recorder.endRecording();
    final composed = await picture.toImage(cardWidth.round(), cardHeight.round());
    final byteData = await composed.toByteData(format: ui.ImageByteFormat.png);
    if (byteData == null) return;

    final dir = await getTemporaryDirectory();
    final file = File('${dir.path}/hairapy_share_${DateTime.now().millisecondsSinceEpoch}.png');
    await file.writeAsBytes(byteData.buffer.asUint8List());

    // Dung API tinh Share.shareXFiles (on dinh qua nhieu ban share_plus,
    // thay vi SharePlus.instance/ShareParams co the chua co trong ban dang
    // duoc pub resolve).
    await Share.shareXFiles(
      [XFile(file.path)],
      text: 'Mình vừa thử kiểu tóc "$styleName" trên Hairapy — Scan. Style. Smile. 💇',
    );
  }
}
