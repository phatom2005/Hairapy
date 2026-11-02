import 'dart:io';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

/// So sánh Trước/Sau bằng thanh kéo ngang — khớp BeforeAfter bên web.
/// Bên trái thanh = ảnh gốc, bên phải = ảnh kết quả.
class BeforeAfterView extends StatefulWidget {
  final File before;
  final String afterUrl;
  const BeforeAfterView({super.key, required this.before, required this.afterUrl});

  @override
  State<BeforeAfterView> createState() => _BeforeAfterViewState();
}

class _BeforeAfterViewState extends State<BeforeAfterView> {
  double _pos = 0.5;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, c) {
        final w = c.maxWidth;
        void update(double dx) => setState(() => _pos = (dx / w).clamp(0.0, 1.0));
        return GestureDetector(
          behavior: HitTestBehavior.opaque,
          onHorizontalDragUpdate: (d) => update(d.localPosition.dx),
          onTapDown: (d) => update(d.localPosition.dx),
          child: Stack(
            fit: StackFit.expand,
            children: [
              CachedNetworkImage(imageUrl: widget.afterUrl, fit: BoxFit.cover),
              // Ảnh gốc chỉ hiện phần bên trái thanh kéo: khung rộng w*_pos, ảnh bên trong vẫn rộng w
              Positioned(
                left: 0,
                top: 0,
                bottom: 0,
                width: w * _pos,
                child: ClipRect(
                  child: OverflowBox(
                    alignment: Alignment.centerLeft,
                    minWidth: w,
                    maxWidth: w,
                    child: Image.file(widget.before, fit: BoxFit.cover, width: w, height: c.maxHeight),
                  ),
                ),
              ),
              Positioned(
                left: (w * _pos) - 1,
                top: 0,
                bottom: 0,
                child: Container(width: 2, color: Colors.white),
              ),
              Positioned(
                left: (w * _pos) - 18,
                top: (c.maxHeight / 2) - 18,
                child: Container(
                  width: 36,
                  height: 36,
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                    boxShadow: [BoxShadow(color: Colors.black26, blurRadius: 6)],
                  ),
                  child: const Icon(Icons.compare_arrows_rounded, size: 20, color: Colors.black87),
                ),
              ),
              const Positioned(left: 10, bottom: 10, child: _Tag('Ảnh gốc')),
              const Positioned(right: 10, bottom: 10, child: _Tag('Sau khi thử')),
            ],
          ),
        );
      },
    );
  }
}

class _Tag extends StatelessWidget {
  final String text;
  const _Tag(this.text);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(color: Colors.black.withValues(alpha: 0.55), borderRadius: BorderRadius.circular(8)),
      child: Text(text, style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700)),
    );
  }
}
