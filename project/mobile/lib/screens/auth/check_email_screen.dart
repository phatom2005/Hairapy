import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../providers/auth_provider.dart';
import '../../theme.dart';

/// Màn "Kiểm tra email" sau khi đăng ký (hoặc khi đăng nhập mà email chưa xác thực).
/// Người dùng bấm link trong mail (mở trang web xác thực) rồi quay lại app đăng nhập.
class CheckEmailScreen extends ConsumerStatefulWidget {
  final String email;
  const CheckEmailScreen({super.key, required this.email});

  @override
  ConsumerState<CheckEmailScreen> createState() => _CheckEmailScreenState();
}

class _CheckEmailScreenState extends ConsumerState<CheckEmailScreen> {
  // Khớp cooldown 60s phía backend để tránh bấm gửi lại mà không có tác dụng
  static const _cooldownSeconds = 60;
  Timer? _timer;
  int _remaining = 0;
  bool _sending = false;
  String? _notice;

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _startCooldown() {
    _timer?.cancel();
    setState(() => _remaining = _cooldownSeconds);
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) return t.cancel();
      setState(() => _remaining--);
      if (_remaining <= 0) t.cancel();
    });
  }

  Future<void> _resend() async {
    if (widget.email.isEmpty || _sending || _remaining > 0) return;
    setState(() {
      _sending = true;
      _notice = null;
    });
    final ok = await ref.read(authProvider.notifier).resendVerification(widget.email);
    if (!mounted) return;
    setState(() {
      _sending = false;
      _notice = ok
          ? 'Nếu email này chưa được xác thực, chúng tôi đã gửi lại liên kết mới.'
          : 'Không gửi được email. Vui lòng thử lại sau.';
    });
    if (ok) _startCooldown();
  }

  @override
  Widget build(BuildContext context) {
    final canResend = widget.email.isNotEmpty && !_sending && _remaining <= 0;

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/login'),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(28, 24, 28, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Icon(Icons.mark_email_unread_outlined, size: 72, color: AppColors.brand),
              const SizedBox(height: 20),
              const Text(
                'Kiểm tra email của bạn',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 24, fontWeight: FontWeight.w700, color: AppColors.ink),
              ),
              const SizedBox(height: 10),
              Text.rich(
                TextSpan(
                  text: 'Chúng tôi đã gửi liên kết xác thực tới ',
                  style: const TextStyle(fontSize: 14, color: AppColors.mauve, height: 1.5),
                  children: [
                    if (widget.email.isNotEmpty)
                      TextSpan(
                        text: widget.email,
                        style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.ink),
                      ),
                    const TextSpan(
                      text: '. Bấm vào liên kết trong email (kiểm tra cả mục Spam), '
                          'sau đó quay lại đây để đăng nhập.',
                    ),
                  ],
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 28),
              ElevatedButton(
                onPressed: () => context.go('/login'),
                child: const Text('Tôi đã xác thực — Đăng nhập'),
              ),
              const SizedBox(height: 12),
              OutlinedButton(
                onPressed: canResend ? _resend : null,
                child: _sending
                    ? const SizedBox(
                        height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2))
                    : Text(_remaining > 0 ? 'Gửi lại sau ${_remaining}s' : 'Gửi lại email xác thực'),
              ),
              if (_notice != null) ...[
                const SizedBox(height: 14),
                Text(
                  _notice!,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 13, color: AppColors.mauve),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
