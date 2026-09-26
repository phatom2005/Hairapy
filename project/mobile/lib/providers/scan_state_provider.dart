import 'dart:io';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/face_shape_analyzer.dart';

/// Giữ lại ảnh gốc + kết quả phân tích của lượt quét gần nhất trong phiên hiện tại,
/// để màn Thử tóc (Swap) dùng lại đúng 1 ảnh đó khi gọi POST /swap/submit — khớp
/// useScanStore bên web (imageFile/analysisResult dùng chung giữa Scan/Results/Swap).
class ScanState {
  final File? image;
  final String? faceShape;
  final String? hairType;
  final FaceShapeMetrics? metrics;

  const ScanState({this.image, this.faceShape, this.hairType, this.metrics});

  ScanState copyWith({File? image, String? faceShape, String? hairType, FaceShapeMetrics? metrics}) =>
      ScanState(
        image: image ?? this.image,
        faceShape: faceShape ?? this.faceShape,
        hairType: hairType ?? this.hairType,
        metrics: metrics ?? this.metrics,
      );
}

class ScanStateNotifier extends StateNotifier<ScanState> {
  ScanStateNotifier() : super(const ScanState());

  void setImage(File image) => state = state.copyWith(image: image);

  /// Lưu kết quả phân tích dáng mặt thật (từ FaceShapeAnalyzer) để màn Results
  /// đọc lại mà không phải phân tích lại lần nữa.
  void setAnalysisResult(FaceShapeResult result) => state = ScanState(
        image: state.image,
        faceShape: result.faceShape,
        hairType: state.hairType,
        metrics: result.metrics,
      );

  void clear() => state = const ScanState();
}

final scanStateProvider = StateNotifierProvider<ScanStateNotifier, ScanState>(
  (ref) => ScanStateNotifier(),
);
