import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../providers/auth_provider.dart';
import '../../theme.dart';

class ForgotPasswordScreen extends ConsumerStatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  ConsumerState<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends ConsumerState<ForgotPasswordScreen> {
  final _emailCtrl = TextEditingController();
  bool _sent = false;

  @override
  void dispose() {
    _emailCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_emailCtrl.text.trim().isEmpty) return;
    final ok = await ref.read(authProvider.notifier).forgotPassword(_emailCtrl.text.trim());
    if (ok && mounted) setState(() => _sent = true);
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);

    return Scaffold(
      appBar: AppBar(leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => context.pop())),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(28, 4, 28, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text('Quên mật khẩu',
                  style: TextStyle(fontSize: 24, fontWeight: FontWeight.w700, color: AppColors.ink)),
              const SizedBox(height: 6),
              const Text('Nhập email đã đăng ký, hệ thống sẽ gửi liên kết đặt lại mật khẩu.',
                  style: TextStyle(fontSize: 13.5, color: AppColors.mauve)),
              const SizedBox(height: 24),
              if (_sent) ...[
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.lime.withValues(alpha: 0.25),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: const Text(
                    'Nếu email tồn tại trong hệ thống, liên kết đặt lại mật khẩu đã được gửi. '
                    'Kiểm tra hộp thư rồi dán mã token vào màn Đặt lại mật khẩu.',
                    style: TextStyle(fontSize: 13, color: AppColors.ink, height: 1.5),
                  ),
                ),
                const SizedBox(height: 16),
                OutlinedButton(
                  onPressed: () => context.push('/reset-password'),
                  child: const Text('Tôi đã có mã, đặt lại mật khẩu'),
                ),
              ] else ...[
                const Text('Email', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                const SizedBox(height: 6),
                TextField(controller: _emailCtrl, keyboardType: TextInputType.emailAddress),
                if (auth.error != null) ...[
                  const SizedBox(height: 10),
                  Text(auth.error!, style: const TextStyle(color: Colors.red, fontSize: 13)),
                ],
                const SizedBox(height: 22),
                ElevatedButton(
                  onPressed: auth.isLoading ? null : _submit,
                  child: auth.isLoading
                      ? const SizedBox(
                          height: 20, width: 20,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Text('Gửi liên kết đặt lại'),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
