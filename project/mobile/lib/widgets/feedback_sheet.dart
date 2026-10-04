import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/api_client.dart';
import '../theme.dart';

/// Hiển thị bottom sheet thu thập đánh giá của người dùng sau khi dùng AI.
Future<void> showFeedbackSheet(
  BuildContext context,
  WidgetRef ref,
  String feature,
) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.white,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
    ),
    builder: (ctx) => _FeedbackSheetContent(feature: feature),
  );
}

class _FeedbackSheetContent extends StatefulWidget {
  final String feature;
  const _FeedbackSheetContent({required this.feature});

  @override
  State<_FeedbackSheetContent> createState() => _FeedbackSheetContentState();
}

class _FeedbackSheetContentState extends State<_FeedbackSheetContent> {
  int _rating = 0;
  final _commentController = TextEditingController();
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_rating == 0 || _loading) return;

    setState(() {
      _loading = true;
      _error = null;
    });

    final comment = _commentController.text.trim();
    try {
      await ApiClient.instance.dio.post('/feedback', data: {
        'rating': _rating,
        'comment': comment.isEmpty ? null : comment,
        'feature': widget.feature,
      });

      if (!mounted) return;
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Cảm ơn bạn đã đánh giá!'),
          backgroundColor: AppColors.primary,
        ),
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
    final starLabels = ['Rất tệ', 'Tệ', 'Bình thường', 'Hài lòng', 'Rất hài lòng'];

    return Padding(
      padding: EdgeInsets.fromLTRB(24, 20, 24, 24 + bottomInset),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.line,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 16),
          const Text(
            'Đánh giá trải nghiệm',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: AppColors.ink,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 6),
          Text(
            widget.feature == 'FACE_SCAN'
                ? 'Bạn cảm thấy kết quả quét khuôn mặt thế nào?'
                : 'Bạn cảm thấy kết quả thử kiểu tóc thế nào?',
            style: const TextStyle(fontSize: 13, color: AppColors.muted),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 18),
          // 5 Ngôi sao
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(5, (index) {
              final star = index + 1;
              final selected = star <= _rating;
              return IconButton(
                onPressed: () => setState(() => _rating = star),
                icon: Icon(
                  selected ? Icons.star_rounded : Icons.star_outline_rounded,
                  color: selected ? Colors.amber : Colors.grey.shade400,
                  size: 38,
                ),
                tooltip: '$star sao',
              );
            }),
          ),
          if (_rating > 0)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(
                starLabels[_rating - 1],
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: Colors.amber,
                ),
              ),
            ),
          const SizedBox(height: 16),
          // Ô nhận xét
          TextField(
            controller: _commentController,
            maxLength: 500,
            maxLines: 3,
            decoration: InputDecoration(
              hintText: 'Chia sẻ nhận xét hoặc góp ý (không bắt buộc)...',
              hintStyle: const TextStyle(fontSize: 13, color: AppColors.muted),
              filled: true,
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
              padding: const EdgeInsets.only(bottom: 12),
              child: Text(
                _error!,
                style: const TextStyle(color: Colors.red, fontSize: 12, fontWeight: FontWeight.w600),
                textAlign: TextAlign.center,
              ),
            ),
          const SizedBox(height: 8),
          ElevatedButton(
            onPressed: (_rating == 0 || _loading) ? null : _submit,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              minimumSize: const Size.fromHeight(48),
            ),
            child: _loading
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : const Text('Gửi đánh giá', style: TextStyle(fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
  }
}
