import 'dart:io';
import 'dart:math';
import 'package:flutter/material.dart';
import '../theme.dart';

/// Ve de luoi 468 diem mesh khuon mat that (tu ML Kit) len tren anh, kem hieu
/// ung "quet" tu tren xuong va cac diem fade-in dan -- tao cam giac AI dang
/// thuc su phan tich khuon mat ngay truoc mat nguoi dung, thay vi chi 1 vong
/// xoay loading vo tri. Day la du lieu that (dung toa do landmark that duoc
/// dung de tinh faceShape), khong phai hieu ung gia.
class FaceMeshOverlay extends StatefulWidget {
  final File image;
  final List<Offset> normalizedPoints; // toa do 0..1 theo kich thuoc anh
  final Duration duration;

  const FaceMeshOverlay({
    super.key,
    required this.image,
    required this.normalizedPoints,
    this.duration = const Duration(milliseconds: 1300),
  });

  @override
  State<FaceMeshOverlay> createState() => _FaceMeshOverlayState();
}

class _FaceMeshOverlayState extends State<FaceMeshOverlay> with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  // Tinh thu tu xao tron 1 LAN DUY NHAT khi tao overlay -- truoc do
  // List.generate + shuffle bi lam lai trong paint() moi frame (~60-70
  // lan/giay), gay tut frame nang tren may yeu (vd Samsung A51) va rat co
  // the la nguyen nhan gay "treo" + spam assertion semantics khi drop frame.
  late final List<int> _pointOrder;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: widget.duration)..forward();
    _pointOrder = List<int>.generate(widget.normalizedPoints.length, (i) => i)..shuffle(Random(42));
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(24),
      child: Stack(
        fit: StackFit.expand,
        children: [
          Image.file(widget.image, fit: BoxFit.cover),
          RepaintBoundary(
            child: AnimatedBuilder(
              animation: _controller,
              builder: (context, _) => CustomPaint(
                painter: _MeshPainter(points: widget.normalizedPoints, order: _pointOrder, progress: _controller.value),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _MeshPainter extends CustomPainter {
  final List<Offset> points;
  final List<int> order; // thu tu xao tron, tinh san tu ben ngoai (khong tinh lai moi frame)
  final double progress; // 0..1

  _MeshPainter({required this.points, required this.order, required this.progress});

  @override
  void paint(Canvas canvas, Size size) {
    if (points.isEmpty) return;

    // Duong quet sang chay tu tren xuong duoi trong nua dau animation.
    final scanY = size.height * (progress * 1.4).clamp(0.0, 1.0);
    if (progress < 0.85) {
      final scanPaint = Paint()
        ..shader = LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [AppColors.lime.withValues(alpha: 0.0), AppColors.lime.withValues(alpha: 0.55), AppColors.lime.withValues(alpha: 0.0)],
        ).createShader(Rect.fromLTWH(0, scanY - 40, size.width, 80));
      canvas.drawRect(Rect.fromLTWH(0, scanY - 40, size.width, 80), scanPaint);
    }

    final dotPaint = Paint()..color = AppColors.lime.withValues(alpha: 0.9);
    final linePaint = Paint()
      ..color = AppColors.lime.withValues(alpha: 0.35)
      ..strokeWidth = 0.6;

    // Chi hien cac diem nam phia tren duong quet (theo % progress), tao cam
    // giac cac diem "xuat hien dan" theo thu tu thay vi bung het cung luc.
    final visibleCount = (points.length * progress.clamp(0.0, 1.0)).round();
    // Dung thu tu da tinh san (order) tu ben ngoai -- KHONG tao/shuffle lai
    // o day, vi paint() chay moi frame.
    final visibleIdx = order.take(visibleCount).toSet();

    for (final i in visibleIdx) {
      final p = Offset(points[i].dx * size.width, points[i].dy * size.height);
      canvas.drawCircle(p, 1.6, dotPaint);
    }

    // Noi vai duong luoi thua giua cac diem gan nhau de trong giong "mesh"
    // hon la cham roi rac (chi noi 1 phan nho de khong ron mat / nang may).
    for (int i = 0; i + 1 < points.length && i < 200; i += 7) {
      if (!visibleIdx.contains(i) || !visibleIdx.contains(i + 1)) continue;
      final a = Offset(points[i].dx * size.width, points[i].dy * size.height);
      final b = Offset(points[i + 1].dx * size.width, points[i + 1].dy * size.height);
      if ((a - b).distance < size.width * 0.08) {
        canvas.drawLine(a, b, linePaint);
      }
    }
  }

  @override
  bool shouldRepaint(covariant _MeshPainter oldDelegate) => oldDelegate.progress != progress;
}
