import 'dart:io';
import 'dart:math';
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:google_mlkit_face_mesh_detection/google_mlkit_face_mesh_detection.dart';

/// Kết quả phân tích dáng mặt: khớp đúng shape với `analysisResult` bên web
/// (lib/faceAnalysis.js) để không phải dịch lại field name ở tầng UI.
class FaceShapeResult {
  final String faceShape; // "Oval" | "Round" | "Square" | "Heart" | "Oblong" | "Diamond"
  final FaceShapeMetrics metrics;
  // Toan bo diem mesh (468 diem that tu ML Kit), toa do chuan hoa ve khoang
  // 0..1 theo kich thuoc anh goc -- de ve overlay "AI dang nhin thay mat ban"
  // len dung vi tri tren anh du hien thi o kich thuoc nao (xem
  // widgets/face_mesh_overlay.dart). Rong neu khong co san (fallback an toan).
  final List<ui.Offset> meshPoints;

  const FaceShapeResult({required this.faceShape, required this.metrics, this.meshPoints = const []});
}

class FaceShapeMetrics {
  final double r1, r2, r3, jawToCheek;
  final double foreheadWidth, cheekboneWidth, jawWidth, faceLength;

  const FaceShapeMetrics({
    required this.r1,
    required this.r2,
    required this.r3,
    required this.jawToCheek,
    required this.foreheadWidth,
    required this.cheekboneWidth,
    required this.jawWidth,
    required this.faceLength,
  });

  // Alias giữ đúng tên field mà web dùng để hiển thị "Tỷ lệ rộng/dài", "Tỷ lệ trán/hàm".
  double get widthToLength => 1 / r1;
  double get foreheadToJaw => r2;
}

/// Lỗi nghiệp vụ (không tìm thấy mặt / ảnh lỗi) — hiển thị trực tiếp message
/// này cho người dùng, giống hệt cách ScanPage.jsx bắt lỗi từ analyzeFace().
class FaceAnalysisException implements Exception {
  final String message;
  const FaceAnalysisException(this.message);
  @override
  String toString() => message;
}

/// Port 1:1 thuật toán phân loại dáng mặt từ project/frontend/src/lib/faceAnalysis.js
/// (hàm classifyFaceShape) — giữ nguyên hệ số ngưỡng để 2 nền tảng cho cùng kết quả
/// với cùng 1 khuôn mặt. Tách riêng thành pure function để dễ so sánh/test độc lập,
/// y hệt cách bên web tách ra để unit test.
FaceShapeResult classifyFaceShape({
  required double foreheadWidth,
  required double cheekboneWidth,
  required double jawWidth,
  required double faceLength,
}) {
  if (faceLength == 0 || cheekboneWidth == 0) {
    throw const FaceAnalysisException('Kích thước khuôn mặt không hợp lệ để phân tích.');
  }

  final r1 = faceLength / cheekboneWidth;
  final r2 = foreheadWidth / jawWidth;
  final r3 = cheekboneWidth / ((foreheadWidth + jawWidth) / 2);
  final jawToCheek = jawWidth / cheekboneWidth;

  final String faceShape;
  if (r1 <= 1.15) {
    faceShape = jawToCheek > 0.88 ? 'Square' : 'Round';
  } else if (r1 >= 1.6) {
    faceShape = 'Oblong';
  } else if (r2 >= 1.15) {
    faceShape = 'Heart';
  } else if (r3 >= 1.1) {
    faceShape = 'Diamond';
  } else {
    faceShape = 'Oval';
  }

  return FaceShapeResult(
    faceShape: faceShape,
    metrics: FaceShapeMetrics(
      r1: r1,
      r2: r2,
      r3: r3,
      jawToCheek: jawToCheek,
      foreheadWidth: foreheadWidth,
      cheekboneWidth: cheekboneWidth,
      jawWidth: jawWidth,
      faceLength: faceLength,
    ),
  );
}

/// Detector on-device dùng Google ML Kit Face Mesh Detection — cùng bộ 468/478
/// điểm mesh (cùng topology, cùng chỉ số) với model MediaPipe FaceLandmarker mà
/// web đang dùng, nên có thể lấy đúng các landmark index 70/300/234/454/172/397/
/// 10/152 y hệt bên web thay vì phải tự suy ra bộ điểm khác.
///
/// LƯU Ý QUAN TRỌNG: gói `google_mlkit_face_mesh_detection` hiện chỉ hỗ trợ
/// Android (API này bên Google ML Kit vẫn ở dạng beta, chưa có bản iOS). Nếu
/// build cho iOS sau này, phần này cần thay bằng giải pháp khác (vd:
/// Vision framework của Apple) — không dùng được nguyên xi trên iOS.
class FaceShapeAnalyzer {
  FaceShapeAnalyzer._();
  static final FaceShapeAnalyzer instance = FaceShapeAnalyzer._();

  FaceMeshDetector? _detector;

  FaceMeshDetector _ensureDetector() {
    return _detector ??= FaceMeshDetector(option: FaceMeshDetectorOptions.faceMesh);
  }

  double _distance(FaceMeshPoint a, FaceMeshPoint b) {
    final dx = a.x - b.x;
    final dy = a.y - b.y;
    final dz = a.z - b.z;
    return sqrt(dx * dx + dy * dy + dz * dz);
  }

  /// Phân tích 1 ảnh (đường dẫn file) và trả về dáng mặt + chỉ số đo được.
  /// Throws [FaceAnalysisException] nếu không tìm thấy khuôn mặt trong ảnh.
  Future<FaceShapeResult> analyze(File imageFile) async {
    final detector = _ensureDetector();
    final inputImage = InputImage.fromFilePath(imageFile.path);

    final List<FaceMesh> meshes;
    try {
      meshes = await detector.processImage(inputImage);
    } catch (e) {
      throw FaceAnalysisException('Không thể xử lý ảnh để phân tích khuôn mặt: $e');
    }

    if (meshes.isEmpty) {
      throw const FaceAnalysisException(
        'Không tìm thấy khuôn mặt trong ảnh. Vui lòng chụp/chọn ảnh rõ mặt hơn.',
      );
    }

    // Chỉ xử lý 1 khuôn mặt đầu tiên — khớp numFaces: 1 bên web.
    final points = meshes.first.points;

    // Cùng chỉ số landmark với faceAnalysis.js:
    // - forehead: 70 & 300 (hai bên trán)
    // - cheekbone: 234 & 454 (hai bên gò má)
    // - jaw: 172 & 397 (hai bên hàm)
    // - faceLength: 10 (trán trên) & 152 (cằm dưới)
    if (points.length < 468) {
      throw const FaceAnalysisException(
        'Không đọc đủ điểm mốc khuôn mặt. Vui lòng thử lại với ảnh khác.',
      );
    }

    final foreheadWidth = _distance(points[70], points[300]);
    final cheekboneWidth = _distance(points[234], points[454]);
    final jawWidth = _distance(points[172], points[397]);
    final faceLength = _distance(points[10], points[152]);

    final result = classifyFaceShape(
      foreheadWidth: foreheadWidth,
      cheekboneWidth: cheekboneWidth,
      jawWidth: jawWidth,
      faceLength: faceLength,
    );

    // Chuan hoa toan bo 468 diem ve khoang 0..1 theo kich thuoc anh that (lay
    // qua decodeImageFromList) -- de widget overlay ve dung vi tri bat ke anh
    // duoc hien thi to/nho the nao. Bat loi nay khong nghiem trong: van tra
    // ve ket qua phan tich binh thuong, chi la khong co mesh de ve.
    List<ui.Offset> normalizedPoints = const [];
    try {
      final bytes = await imageFile.readAsBytes();
      final codec = await ui.instantiateImageCodec(Uint8List.fromList(bytes));
      final frame = await codec.getNextFrame();
      final w = frame.image.width.toDouble();
      final h = frame.image.height.toDouble();
      if (w > 0 && h > 0) {
        normalizedPoints = points.map((p) => ui.Offset(p.x / w, p.y / h)).toList();
      }
    } catch (_) {
      // giu nguyen danh sach rong, khong lam gian doan luong phan tich chinh
    }

    return FaceShapeResult(faceShape: result.faceShape, metrics: result.metrics, meshPoints: normalizedPoints);
  }

  Future<void> dispose() async {
    await _detector?.close();
    _detector = null;
  }
}
