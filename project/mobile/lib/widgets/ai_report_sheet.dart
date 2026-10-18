import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import '../api/api_client.dart';
import '../theme.dart';

/// Các lý do báo cáo — khớp enum AiReportReason ở backend.
const List<({String value, String label, IconData icon})> _kReportReasons = [
  (value: 'INAPPROPRIATE', label: 'Nội dung phản cảm / không phù hợp', icon: Icons.warning_amber_rounded),
  (value: 'DISTORTED', label: 'Ảnh bị méo, lỗi hoặc sai lệch', icon: Icons.broken_image_outlined),
  (value: 'PRIVACY', label: 'Vi phạm quyền riêng tư', icon: Icons.lock_outline_rounded),
  (value: 'OTHER', label: 'Lý do khác', icon: Icons.more_horiz_rounded),
];

/// Mở bottom sheet báo cáo ảnh do AI tạo ra (chính sách Google Play về nội dung AI).
Future<void> showAiReportSheet(
  BuildContext context, {
  String? imageUrl,
  int? hairstyleId,
  String feature = 'HAIR_SWAP',
}) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.white,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
    ),
    builder: (ctx) => _AiReportSheetContent(
      imageUrl: imageUrl,
      hairstyleId: hairstyleId,
      feature: feature,
    ),
  );
}

class _AiReportSheetContent extends StatefulWidget {
  final String? imageUrl;
  final int? hairstyleId;
  final String feature;
  const _AiReportSheetContent({
    required this.imageUrl,
    required this.hairstyleId,
    required this.feature,
  });

  @override
  State<_AiReportSheetContent> createState() => _AiReportSheetContentState();
}

class _AiReportSheetContentState extends State<_AiReportSheetContent> {
  String? _reason;
  final _commentController = TextEditingController();
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_reason == null || _loading) return;
    setState(() {
      _loading = true;
      _error = null;
    });

    final comment = _commentController.text.trim();
    try {
      await ApiClient.instance.dio.post('/reports', data: {
        'reason': _reason,
        'comment': comment.isEmpty ? null : comment,
        'imageUrl': widget.imageUrl,
        'hairstyleId': widget.hairstyleId,
        'feature': widget.feature,
      });
      if (!mounted) return;
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Đã gửi báo cáo. Cảm ơn bạn, chúng mình sẽ xem xét sớm nhất.')),
      );
    } on DioException catch (e) {
      if (!mounted) return;
      final data = e.response?.data;
      String msg = 'Không gửi được, thử lại sau.';
      if (e.response?.statusCode == 429 && data is Map && data['error'] is String) {
        msg = data['error'] as String;
      }
      setState(() {
        _loading = false;
        _error = msg;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = 'Không gửi được, thử lại sau.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return SingleChildScrollView(
      padding: EdgeInsets.fromLTRB(24, 20, 24, 24 + bottomInset),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(color: AppColors.line, borderRadius: BorderRadius.circular(2)),
            ),
          ),
          const SizedBox(height: 16),
          Text('Báo cáo ảnh do AI tạo ra',
              textAlign: TextAlign.center, style: AppFonts.display(fontSize: 16)),
          const SizedBox(height: 6),
          const Text(
            'Cho chúng mình biết ảnh này có vấn đề gì nhé.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 13, color: AppColors.muted),
          ),
          const SizedBox(height: 16),
          for (final r in _kReportReasons)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: InkWell(
                borderRadius: BorderRadius.circular(14),
                onTap: () => setState(() => _reason = r.value),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 150),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  decoration: BoxDecoration(
                    color: _reason == r.value ? AppColors.primary.withValues(alpha: 0.07) : AppColors.canvas,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: _reason == r.value ? AppColors.primary : AppColors.line,
                      width: 1.5,
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(r.icon, size: 20, color: _reason == r.value ? AppColors.primary : AppColors.muted),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(r.label,
                            style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600, color: AppColors.ink)),
                      ),
                      Icon(
                        _reason == r.value ? Icons.radio_button_checked : Icons.radio_button_unchecked,
                        size: 20,
                        color: _reason == r.value ? AppColors.primary : AppColors.line,
                      ),
                    ],
                  ),
                ),
              ),
            ),
          const SizedBox(height: 4),
          TextField(
            controller: _commentController,
            maxLength: 500,
            maxLines: 2,
            decoration: InputDecoration(
              hintText: 'Mô tả thêm (không bắt buộc)...',
              hintStyle: const TextStyle(fontSize: 13, color: AppColors.muted),
              fillColor: AppColors.canvas,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: const BorderSide(color: AppColors.line),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: const BorderSide(color: AppColors.line),
              ),
            ),
          ),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Text(
                _error!,
                style: const TextStyle(color: Colors.red, fontSize: 12, fontWeight: FontWeight.w600),
                textAlign: TextAlign.center,
              ),
            ),
          const SizedBox(height: 8),
          ElevatedButton(
            onPressed: (_reason == null || _loading) ? null : _submit,
            child: _loading
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : const Text('Gửi báo cáo'),
          ),
        ],
      ),
    );
  }
}
