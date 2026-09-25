import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import '../../api/api_client.dart';
import '../../models/usage_summary.dart';
import '../../providers/scan_state_provider.dart';
import '../../theme.dart';
import '../../widgets/app_bottom_nav.dart';

/// Provider quota — cùng ý nghĩa với queryKey ["usage-summary"] bên web:
/// invalidate (refresh) sau mỗi lần quét/thử tóc thành công hoặc lỗi 429.
final usageSummaryProvider = FutureProvider.autoDispose<UsageSummary>((ref) async {
  final res = await ApiClient.instance.dio.get('/usage/me');
  return UsageSummary.fromJson(res.data as Map<String, dynamic>);
});

class ScanScreen extends ConsumerStatefulWidget {
  const ScanScreen({super.key});

  @override
  ConsumerState<ScanScreen> createState() => _ScanScreenState();
}

class _ScanScreenState extends ConsumerState<ScanScreen> {
  File? _picked;
  bool _analyzing = false;
  String? _error;

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
    try {
      // TODO: upload _picked lên POST /profile/scans (multipart) — quota gate
      // thật sự nằm ở backend (usageService.reserveUsage), giống hệt web.
      // 429 -> hiện lỗi đỏ, KHÔNG điều hướng sang Results (đúng root-cause fix
      // đã áp dụng bên web: ScanPage.jsx return sớm khi backendErr.status===429).
      await Future.delayed(const Duration(seconds: 1)); // placeholder
      // Giữ lại đúng tấm ảnh vừa quét để màn Thử tóc dùng lại (khớp
      // useScanStore.imageFile bên web — dùng chung 1 ảnh gốc Scan -> Swap).
      ref.read(scanStateProvider.notifier).setImage(_picked!);
      ref.invalidate(usageSummaryProvider);
      if (mounted) context.go('/results');
    } catch (e) {
      setState(() => _error = 'Bạn đã hết lượt quét khuôn mặt hôm nay.');
    } finally {
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
              child: DottedUploadArea(
                picked: _picked,
                onPickGallery: () => _pick(ImageSource.gallery),
                onPickCamera: () => _pick(ImageSource.camera),
              ),
            ),
            const SizedBox(height: 16),
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
      bottomNavigationBar: const AppBottomNav(currentIndex: 0),
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
