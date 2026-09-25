import 'dart:io';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Giữ lại ảnh gốc + kết quả phân tích của lượt quét gần nhất trong phiên hiện tại,
/// để màn Thử tóc (Swap) dùng lại đúng 1 ảnh đó khi gọi POST /swap/submit — khớp
/// useScanStore bên web (imageFile/analysisResult dùng chung giữa Scan/Results/Swap).
class ScanState {
  final File? image;
  final String? faceShape;
  final String? hairType;

  const ScanState({this.image, this.faceShape, this.hairType});

  ScanState copyWith({File? image, String? faceShape, String? hairType}) => ScanState(
        image: image ?? this.image,
        faceShape: faceShape ?? this.faceShape,
        hairType: hairType ?? this.hairType,
      );
}

class ScanStateNotifier extends StateNotifier<ScanState> {
  ScanStateNotifier() : super(const ScanState());

  void setImage(File image) => state = state.copyWith(image: image);

  void clear() => state = const ScanState();
}

final scanStateProvider = StateNotifierProvider<ScanStateNotifier, ScanState>(
  (ref) => ScanStateNotifier(),
);
