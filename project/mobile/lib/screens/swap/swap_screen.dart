import 'dart:async';
import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../api/api_client.dart';
import '../../models/hairstyle.dart';
import '../../providers/auth_provider.dart';
import '../../providers/scan_state_provider.dart';
import '../../screens/scan/scan_screen.dart' show usageSummaryProvider;
import '../../theme.dart';

enum _Phase { idle, submitting, polling, done, error }

/// Khớp HairSwapController.java: submit ảnh (multipart) -> nhận taskId ngay,
/// rồi tự poll GET /swap/status/{taskId} mỗi ~3s cho tới khi DONE/ERROR —
/// không có request nào chặn quá lâu, và lỗi AI timeout tự hoàn lượt ở backend.
class SwapScreen extends ConsumerStatefulWidget {
  final Hairstyle? hairstyle;
  const SwapScreen({super.key, this.hairstyle});

  @override
  ConsumerState<SwapScreen> createState() => _SwapScreenState();
}

class _SwapScreenState extends ConsumerState<SwapScreen> {
  _Phase _phase = _Phase.idle;
  String? _resultImage;
  String? _error;
  bool _refunded = false;
  Timer? _pollTimer;

  @override
  void dispose() {
    _pollTimer?.cancel();
    super.dispose();
  }

  Future<void> _submit() async {
    final hairstyle = widget.hairstyle;
    final image = ref.read(scanStateProvider).image;
    if (hairstyle == null || hairstyle.ailabProStyle == null) {
      setState(() {
        _phase = _Phase.error;
        _error = 'Kiểu tóc này chưa có dữ liệu AI (ailabProStyle). Vui lòng chọn kiểu khác.';
      });
      return;
    }
    if (image == null) return; // nút Bắt đầu đã bị disable trong trường hợp này

    setState(() {
      _phase = _Phase.submitting;
      _error = null;
      _refunded = false;
    });

    try {
      final formData = FormData.fromMap({
        'image': await MultipartFile.fromFile(image.path),
        'hairStyle': hairstyle.ailabProStyle,
        'hairstyleId': hairstyle.id,
      });
      final res = await ApiClient.instance.dio.post('/swap/submit', data: formData);
      final taskId = (res.data as Map<String, dynamic>)['taskId'] as String;
      setState(() => _phase = _Phase.polling);
      _poll(taskId);
    } on DioException catch (e) {
      final data = e.response?.data;
      String message = 'Không thể xử lý ảnh bằng AI. Vui lòng thử lại sau.';
      bool refunded = false;
      if (data is Map) {
        if (data['error'] is String) message = data['error'] as String;
        refunded = data['refunded'] == true;
      }
      setState(() {
        _phase = _Phase.error;
        _error = message;
        _refunded = refunded;
      });
    }
  }

  void _poll(String taskId) {
    _pollTimer = Timer(const Duration(seconds: 3), () async {
      try {
        final res = await ApiClient.instance.dio.get('/swap/status/$taskId');
        final data = res.data as Map<String, dynamic>;
        final status = data['status'] as String?;
        if (status == 'DONE') {
          ref.invalidate(usageSummaryProvider);
          if (mounted) setState(() {
            _phase = _Phase.done;
            _resultImage = data['image'] as String?;
          });
          return;
        }
        if (status == 'ERROR') {
          ref.invalidate(usageSummaryProvider);
          if (mounted) setState(() {
            _phase = _Phase.error;
            _error = data['error'] as String? ?? 'AI xử lý quá lâu, lượt của bạn đã được hoàn lại.';
            _refunded = data['refunded'] == true;
          });
          return;
        }
        // PENDING -> tiếp tục poll
        _poll(taskId);
      } catch (_) {
        if (mounted) setState(() {
          _phase = _Phase.error;
          _error = 'Mất kết nối khi kiểm tra trạng thái xử lý. Vui lòng thử lại.';
        });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final hairstyle = widget.hairstyle;
    final image = ref.watch(scanStateProvider).image;
    final user = ref.watch(authProvider).user;

    if (hairstyle != null && hairstyle.premiumOnly && (user == null || !user.isPremium)) {
      // Phòng hờ vào thẳng route (deep link) mà chưa qua chốt chặn ở Catalog/Results.
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) context.pushReplacement('/pricing');
      });
    }

    return Scaffold(
      appBar: AppBar(title: Text(hairstyle?.name ?? 'Thử kiểu tóc')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: _buildBody(context, image),
        ),
      ),
    );
  }

  Widget _buildBody(BuildContext context, File? image) {
    if (image == null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.image_search, size: 56, color: AppColors.muted),
            const SizedBox(height: 16),
            const Text('Chưa có ảnh khuôn mặt', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
            const SizedBox(height: 8),
            const Text('Quét khuôn mặt trước để dùng ảnh đó thử kiểu tóc.',
                textAlign: TextAlign.center, style: TextStyle(color: AppColors.muted, fontSize: 13)),
            const SizedBox(height: 20),
            ElevatedButton(onPressed: () => context.go('/scan'), child: const Text('Đi tới Quét khuôn mặt')),
          ],
        ),
      );
    }

    return Column(
      children: [
        Expanded(
          child: Container(
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(24)),
            clipBehavior: Clip.antiAlias,
            child: switch (_phase) {
              _Phase.done => _resultImage != null
                  ? CachedNetworkImage(imageUrl: _resultImage!, fit: BoxFit.cover, width: double.infinity)
                  : const Center(child: Text('Không có ảnh kết quả')),
              _Phase.submitting || _Phase.polling => Stack(
                  fit: StackFit.expand,
                  children: [
                    Image.file(image, fit: BoxFit.cover),
                    Container(
                      color: Colors.black.withValues(alpha: 0.45),
                      child: const Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            CircularProgressIndicator(color: Colors.white),
                            SizedBox(height: 14),
                            Text('AI đang ghép kiểu tóc…', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              _ => Image.file(image, fit: BoxFit.cover, width: double.infinity),
            },
          ),
        ),
        const SizedBox(height: 16),
        if (_error != null)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Column(
              children: [
                Text(_error!, textAlign: TextAlign.center, style: const TextStyle(color: Colors.red, fontWeight: FontWeight.w600)),
                if (_refunded) const Padding(
                  padding: EdgeInsets.only(top: 4),
                  child: Text('Lượt thử tóc của bạn đã được hoàn lại.', style: TextStyle(color: AppColors.muted, fontSize: 12)),
                ),
              ],
            ),
          ),
        if (_phase == _Phase.done)
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => context.pop(),
                  child: const Text('Xem thêm kiểu khác'),
                ),
              ),
            ],
          )
        else
          ElevatedButton(
            onPressed: (_phase == _Phase.submitting || _phase == _Phase.polling) ? null : _submit,
            child: (_phase == _Phase.submitting || _phase == _Phase.polling)
                ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : Text(_phase == _Phase.error ? 'Thử lại' : 'Bắt đầu ghép kiểu tóc'),
          ),
      ],
    );
  }
}
