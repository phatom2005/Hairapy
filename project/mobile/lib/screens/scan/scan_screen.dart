import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import '../../api/api_client.dart';
import '../../models/usage_summary.dart';
import '../../models/hairstyle.dart';
import '../../providers/scan_state_provider.dart';
import '../../services/face_shape_analyzer.dart';
import '../../theme.dart';
import '../../widgets/app_bottom_nav.dart';
import '../../widgets/face_mesh_overlay.dart';
import 'package:dio/dio.dart';

/// Provider quota — cùng ý nghĩa với queryKey ["usage-summary"] bên web:
/// invalidate (refresh) sau mỗi lần quét/thử tóc thành công hoặc lỗi 429.
final usageSummaryProvider = FutureProvider.autoDispose<UsageSummary>((ref) async {
  final res = await ApiClient.instance.dio.get('/usage/me');
  return UsageSummary.fromJson(res.data as Map<String, dynamic>);
});

/// Cac dong text luan phien trong luc phan tich -- thay the vong xoay loading
/// vo tri bang cac buoc that cua pipeline (tim landmark -> do ty le -> phan
/// loai), giup thoi gian cho (that su chi vai giay) cam giac "co viec dang
/// xay ra" thay vi im lim.
const _kLoadingMessages = [
  'Đang tìm điểm mốc khuôn mặt...',
  'Đang đo tỷ lệ gương mặt...',
  'Đang phân loại dáng mặt...',
];

class ScanScreen extends ConsumerStatefulWidget {
  // Kieu toc da chon tu Catalog truoc khi bi day qua day de quet mat (chua co
  // anh). Neu khac null, sau khi phan tich xong se quay lai man Thu toc mang
  // theo dung kieu nay thay vi di thang sang Results.
  final Hairstyle? pendingHairstyle;
  const ScanScreen({super.key, this.pendingHairstyle});

  @override
  ConsumerState<ScanScreen> createState() => _ScanScreenState();
}

class _ScanScreenState extends ConsumerState<ScanScreen> {
  File? _picked;
  bool _analyzing = false;
  String? _error;

  Timer? _loadingTimer;
  int _loadingIndex = 0;

  // Ket qua vua phan tich xong, dung de ve mesh overlay len anh trong luc
  // "reveal" truoc khi dieu huong di tiep -- xem widgets/face_mesh_overlay.dart.
  FaceShapeResult? _revealResult;
  bool _showMeshReveal = false;

  @override
  void dispose() {
    _loadingTimer?.cancel();
    super.dispose();
  }

  void _startLoadingCycle() {
    _loadingIndex = 0;
    _loadingTimer?.cancel();
    _loadingTimer = Timer.periodic(const Duration(milliseconds: 750), (_) {
      if (!mounted) return;
      setState(() => _loadingIndex = (_loadingIndex + 1) % _kLoadingMessages.length);
    });
  }

  void _stopLoadingCycle() {
    _loadingTimer?.cancel();
    _loadingTimer = null;
  }

  Future<void> _pick(ImageSource source) async {
    final usage = ref.read(usageSummaryProvider).valueOrNull;
    if (usage != null && usage.faceScan.isExhausted) {
      setState(() => _error = 'Bạn đã hết lượt quét khuôn mặt hôm nay.');
      return;
    }
    final picker = ImagePicker();
    final file = await picker.pickImage(source: source, imageQuality: 90);
    if (file == null) return;
    setState(() {
      _picked = File(file.path);
      _error = null;
    });
  }

  Future<void> _analyze() async {
    if (_picked == null) return;
    setState(() {
      _analyzing = true;
      _error = null;
    });
    _startLoadingCycle();
    try {
      // Phân tích dáng mặt THẬT ngay trên máy (on-device, không gửi ảnh lên
      // server cho bước này) — dùng cùng thuật toán + cùng chỉ số landmark với
      // faceAnalysis.js bên web (xem services/face_shape_analyzer.dart).
      final result = await FaceShapeAnalyzer.instance.analyze(_picked!);
      _stopLoadingCycle();

      // Rung nhe xac nhan da tim thay mat + phan tich thanh cong -- diem
      // nhan nho nhung tao cam giac app "cao cap" hon.
      HapticFeedback.mediumImpact();

      // Hien mesh 468 diem that len anh trong chop nhoang truoc khi di tiep,
      // chung minh day la AI that dang phan tich chu khong phai loading gia.
      if (result.meshPoints.isNotEmpty && mounted) {
        setState(() {
          _revealResult = result;
          _showMeshReveal = true;
        });
        await Future.delayed(const Duration(milliseconds: 1400));
        if (mounted) setState(() => _showMeshReveal = false);
      }

      // Giữ lại đúng tấm ảnh + kết quả vừa phân tích để màn Kết quả/Thử tóc
      // dùng lại (khớp useScanStore bên web — dùng chung 1 ảnh gốc Scan -> Swap).
      ref.read(scanStateProvider.notifier).setImage(_picked!);
      ref.read(scanStateProvider.notifier).setAnalysisResult(result);

      // Gửi kết quả lên backend để lưu lịch sử quét — quota gate thật sự nằm ở
      // backend (usageService.reserveUsage), giống hệt startAnalysis() bên web.
      try {
        final formData = FormData.fromMap({
          'faceShape': result.faceShape,
          'hairType': 'Bình thường',
          'image': await MultipartFile.fromFile(_picked!.path),
        });
        await ApiClient.instance.dio.post('/profile/scans', data: formData);
        ref.invalidate(usageSummaryProvider);
      } on DioException catch (e) {
        if (e.response?.statusCode == 429) {
          // Hết lượt quét hôm nay -> dừng lại, KHÔNG điều hướng sang Results
          // (đúng root-cause fix đã áp dụng bên web: return sớm khi status===429).
          final msg = (e.response?.data is Map)
              ? (e.response?.data['error'] as String?)
              : null;
          setState(() => _error = msg ?? 'Bạn đã hết lượt quét khuôn mặt hôm nay.');
          return;
        }
        // Các lỗi lưu lịch sử khác (mạng chập chờn, Cloudinary lỗi...) không
        // chặn trải nghiệm chính — người dùng vẫn thấy được kết quả phân tích,
        // chỉ là lượt quét đó không lưu vào lịch sử. Khớp hành vi try/catch
        // "nuốt lỗi" của startAnalysis() bên web.
      }

      if (mounted) {
        final pending = widget.pendingHairstyle;
        if (pending != null) {
          // Quay lai dung man Thu toc voi kieu toc nguoi dung da chon o
          // Catalog, thay vi lam roi mat lua chon do bang cach di thang
          // Results nhu luong quet thuong.
          context.pushReplacement('/swap', extra: pending);
        } else {
          context.go('/results');
        }
      }
    } on FaceAnalysisException catch (e) {
      setState(() => _error = e.message);
    } catch (e) {
      setState(() => _error = 'Không thể phân tích khuôn mặt. Hãy chắc chắn ảnh rõ mặt.');
    } finally {
      _stopLoadingCycle();
      if (mounted) setState(() => _analyzing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final usageAsync = ref.watch(usageSummaryProvider);
    final quotaText = usageAsync.maybeWhen(
      data: (u) => u.faceScan.unlimited
          ? 'Không giới hạn'
          : '${u.faceScan.used}/${u.faceScan.limit} hôm nay',
      orElse: () => '…',
    );
    final isExhausted = usageAsync.maybeWhen(
      data: (u) => u.faceScan.isExhausted,
      orElse: () => false,
    );

    return Scaffold(
      appBar: AppBar(
        title: const Text('Quét khuôn mặt'),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: Chip(
              label: Text(quotaText, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12)),
              backgroundColor: AppColors.lime,
              side: BorderSide.none,
            ),
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.fromLTRB(24, 8, 24, 24),
        child: Column(
          children: [
            Expanded(
              child: _showMeshReveal && _picked != null && _revealResult != null
                  ? FaceMeshOverlay(image: _picked!, normalizedPoints: _revealResult!.meshPoints)
                  : DottedUploadArea(
                      picked: _picked,
                      onPickGallery: () => _pick(ImageSource.gallery),
                      onPickCamera: () => _pick(ImageSource.camera),
                    ),
            ),
            const SizedBox(height: 16),
            if (_analyzing)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Text(
                  _kLoadingMessages[_loadingIndex],
                  style: const TextStyle(color: AppColors.muted, fontWeight: FontWeight.w600, fontSize: 12.5),
                ),
              ),
            if (_error != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Text(_error!, style: const TextStyle(color: Colors.red, fontWeight: FontWeight.w600)),
              ),
            ElevatedButton(
              onPressed: (_picked == null || _analyzing || isExhausted) ? null : _analyze,
              child: _analyzing
                  ? const SizedBox(
                      height: 20, width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Bắt đầu phân tích'),
            ),
          ],
        ),
      ),
      bottomNavigationBar: const AppBottomNav(currentIndex: 1),
    );
  }
}

class DottedUploadArea extends StatelessWidget {
  final File? picked;
  final VoidCallback onPickGallery;
  final VoidCallback onPickCamera;

  const DottedUploadArea({
    super.key,
    required this.picked,
    required this.onPickGallery,
    required this.onPickCamera,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: AppColors.divider, width: 2),
      ),
      clipBehavior: Clip.antiAlias,
      child: picked != null
          ? Image.file(picked!, fit: BoxFit.cover, width: double.infinity, height: double.infinity)
          : Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.face_retouching_natural, size: 56, color: AppColors.primary),
                  const SizedBox(height: 16),
                  const Text('Chụp ảnh hoặc tải ảnh lên',
                      style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                  const SizedBox(height: 20),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      OutlinedButton(onPressed: onPickGallery, child: const Text('Thư viện ảnh')),
                      const SizedBox(width: 12),
                      FilledButton(onPressed: onPickCamera, child: const Text('Mở camera')),
                    ],
                  ),
                ],
              ),
            ),
    );
  }
}
